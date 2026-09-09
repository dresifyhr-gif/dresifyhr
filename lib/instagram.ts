import "server-only";

import { unstable_cache } from "next/cache";

import { ensureFreshIgToken } from "@/lib/ig-token";

// Instagram statistika + objava dresova preko Meta Graph API-ja (v21.0).
// Sve je best-effort: bez spojenog tokena / na grešku vrati prazno (ok:false) —
// stranica i dalje radi. Graph API metrike Meta zna deprecirati, pa se sve
// parsira obranbeno (isti obrazac kao lib/ga.ts). Fiksirana verzija zbog stabilnosti.

const GRAPH = "https://graph.facebook.com/v21.0";
const TIMEOUT = 8000;

export type IgMedia = {
  id: string;
  caption: string;
  thumbnail: string | null;
  permalink: string | null;
  mediaType: string | null;
  likes: number;
  comments: number;
  timestamp: string | null;
};

export type IgStats = {
  ok: boolean; // true = token spojen i profil dohvaćen
  username: string | null;
  profilePicture: string | null;
  followers: number;
  followsCount: number | null;
  mediaCount: number | null;
  reach7d: number | null;
  reachPrev7d: number | null;
  newFollowers7d: number | null;
  topMedia: IgMedia[];
};

const EMPTY: IgStats = {
  ok: false,
  username: null,
  profilePicture: null,
  followers: 0,
  followsCount: null,
  mediaCount: null,
  reach7d: null,
  reachPrev7d: null,
  newFollowers7d: null,
  topMedia: []
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

async function graphGet(path: string, params: Record<string, string>, token: string) {
  const u = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("access_token", token);
  const r = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Reach (doseg) u zadanom prozoru — total_value agregat. Vrati null na grešku.
async function fetchReach(ig: string, token: string, sinceSec: number, untilSec: number): Promise<number | null> {
  try {
    const j = await graphGet(`${ig}/insights`, {
      metric: "reach",
      period: "day",
      metric_type: "total_value",
      since: String(sinceSec),
      until: String(untilSec)
    }, token);
    const entry = Array.isArray(j?.data) ? j.data[0] : null;
    const v = entry?.total_value?.value ?? entry?.values?.reduce?.((a: number, x: any) => a + (Number(x?.value) || 0), 0);
    return num(v);
  } catch {
    return null;
  }
}

async function fetchNewFollowers(ig: string, token: string, sinceSec: number, untilSec: number): Promise<number | null> {
  try {
    const j = await graphGet(`${ig}/insights`, {
      metric: "follower_count",
      period: "day",
      since: String(sinceSec),
      until: String(untilSec)
    }, token);
    const entry = Array.isArray(j?.data) ? j.data[0] : null;
    const vals: any[] = entry?.values ?? [];
    const sum = vals.reduce((a, x) => a + (Number(x?.value) || 0), 0);
    return num(sum);
  } catch {
    return null; // metrika traži >100 pratitelja; tiho preskoči
  }
}

async function fetchTopMedia(ig: string, token: string): Promise<IgMedia[]> {
  try {
    const j = await graphGet(`${ig}/media`, {
      fields: "id,caption,media_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count",
      limit: "16"
    }, token);
    const arr: any[] = Array.isArray(j?.data) ? j.data : [];
    const media: IgMedia[] = arr.map((m) => ({
      id: String(m?.id ?? ""),
      caption: String(m?.caption ?? "").slice(0, 120),
      thumbnail: m?.thumbnail_url || m?.media_url || null,
      permalink: m?.permalink || null,
      mediaType: m?.media_type || null,
      likes: Number(m?.like_count) || 0,
      comments: Number(m?.comments_count) || 0,
      timestamp: m?.timestamp || null
    }));
    return media.sort((a, b) => b.likes + b.comments - (a.likes + a.comments)).slice(0, 6);
  } catch {
    return [];
  }
}

async function buildStats(): Promise<IgStats> {
  const conn = await ensureFreshIgToken();
  if (!conn || !conn.igBusinessId) return EMPTY;
  const { token, igBusinessId: ig } = conn;

  // Profil je obavezan za ok:true; ostalo je best-effort.
  let profile: any;
  try {
    profile = await graphGet(ig, { fields: "followers_count,follows_count,media_count,username,name,profile_picture_url" }, token);
  } catch {
    return EMPTY;
  }

  const now = Math.floor(Date.now() / 1000);
  const d7 = 7 * 86_400;
  const [reach7d, reachPrev7d, newFollowers7d, topMedia] = await Promise.all([
    fetchReach(ig, token, now - d7, now),
    fetchReach(ig, token, now - 2 * d7, now - d7),
    fetchNewFollowers(ig, token, now - d7, now),
    fetchTopMedia(ig, token)
  ]);

  return {
    ok: true,
    username: profile?.username ? String(profile.username) : conn.username,
    profilePicture: profile?.profile_picture_url || null,
    followers: Number(profile?.followers_count) || 0,
    followsCount: num(profile?.follows_count),
    mediaCount: num(profile?.media_count),
    reach7d,
    reachPrev7d,
    newFollowers7d,
    topMedia
  };
}

// Keširano ~10 min (Graph API rate-limit); revalidira se tagom "ig-stats" nakon spajanja.
const cachedStats = unstable_cache(buildStats, ["ig-stats-v1"], { revalidate: 600, tags: ["ig-stats"] });

export async function getIgStats(): Promise<IgStats> {
  try {
    return await cachedStats();
  } catch {
    return EMPTY;
  }
}

// ————————————————————————————————————————————————————————————————
// Objava slike na Instagram feed (dvokoračno: media container → media_publish).
// image_url MORA biti javno dostupan JPEG. Best-effort: vrati {ok,error}.
// ————————————————————————————————————————————————————————————————
export async function publishImage(input: { imageUrl: string; caption: string }): Promise<{ ok: boolean; id?: string; permalink?: string; error?: string }> {
  const conn = await ensureFreshIgToken();
  if (!conn || !conn.igBusinessId) return { ok: false, error: "Instagram nije spojen." };
  const { token, igBusinessId: ig } = conn;

  try {
    // 1) Napravi media container.
    const createBody = new URLSearchParams({ image_url: input.imageUrl, caption: input.caption, access_token: token });
    const createRes = await fetch(`${GRAPH}/${ig}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody,
      signal: AbortSignal.timeout(20_000)
    });
    if (!createRes.ok) throw new Error(await createRes.text());
    const created = await createRes.json();
    const creationId = String(created?.id || "");
    if (!creationId) throw new Error("Nema creation_id (container).");

    // 2) Pričekaj da container bude spreman (IG obrađuje sliku).
    for (let i = 0; i < 6; i++) {
      try {
        const st = await graphGet(creationId, { fields: "status_code" }, token);
        const code = String(st?.status_code || "");
        if (code === "FINISHED") break;
        if (code === "ERROR") throw new Error("Instagram nije mogao obraditi sliku (ERROR).");
      } catch (e) {
        if (i === 5) throw e;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    // 3) Objavi.
    const pubBody = new URLSearchParams({ creation_id: creationId, access_token: token });
    const pubRes = await fetch(`${GRAPH}/${ig}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: pubBody,
      signal: AbortSignal.timeout(20_000)
    });
    if (!pubRes.ok) throw new Error(await pubRes.text());
    const published = await pubRes.json();
    const mediaId = String(published?.id || "");

    let permalink: string | undefined;
    try {
      const info = await graphGet(mediaId, { fields: "permalink" }, token);
      if (info?.permalink) permalink = String(info.permalink);
    } catch {
      /* permalink je bonus */
    }
    return { ok: true, id: mediaId, permalink };
  } catch (e) {
    // Izvuci Meta error poruku ako postoji ({"error":{"message":"…"}}).
    let msg = e instanceof Error ? e.message : "Nepoznata greška";
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) msg = parsed.error.message;
    } catch {
      /* nije JSON */
    }
    return { ok: false, error: msg };
  }
}
