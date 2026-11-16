import "server-only";

import { createHash, timingSafeEqual } from "crypto";

import type { MediaItem, Prisma } from "@prisma/client";

import { publishCarousel, publishImage } from "@/lib/instagram";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

// DRESIFY MEDIA — zajednička logika (ulaz od agenata, objava, zakazivanje).
// Agenti rade lokalno na Igorovom Macu i šalju ovamo; ništa se ne objavljuje
// bez Igorova klika (ili zakazanog termina koji je on postavio).

// ————————————————————————————————————————————————————————————————
// Konstante
// ————————————————————————————————————————————————————————————————
export const MEDIA_SLOTS = ["12:00", "18:00", "19:30", "21:00"] as const;
export type MediaSlot = (typeof MEDIA_SLOTS)[number];
export const MEDIA_TZ = "Europe/Zagreb";

export const MEDIA_KINDS = ["BRIEF", "IDEA", "DRAFT"] as const;
export const MEDIA_FORMATS = ["FEED_IMAGE", "CAROUSEL", "STORY_MANUAL"] as const;
export const MEDIA_STATUSES = ["NOVO", "ZAKAZANO", "OBJAVLJUJEM", "OBJAVLJENO", "ODBIJENO", "VRACENO", "NEUSPJELO"] as const;
export const IMAGE_SOURCES = ["COMMONS", "AI", "DRESIFY", "UPLOAD", "NONE"] as const;
export const VERIFICATIONS = ["POTVRĐENO", "DJELOMIČNO", "NEPOTVRĐENO", "GLASINA", "MIŠLJENJE"] as const;

export type MediaImage = {
  url: string;
  source: (typeof IMAGE_SOURCES)[number];
  credit?: string;
  license?: string;
  link?: string;
};
export type MediaSource = { label: string; url?: string };
export type MediaScores = { dijeljenje?: number; komentari?: number; emocija?: number; hr?: number; ukupno?: number };

// ————————————————————————————————————————————————————————————————
// Ključ za agente (zaseban od svih ostalih tajni)
// ————————————————————————————————————————————————————————————————
export function verifyIngestKey(request: Request): boolean {
  const secret = (process.env.MEDIA_INGEST_SECRET || "").trim();
  if (secret.length < 24) return false; // bez ključa (ili prekratkog) ruta je zatvorena
  const header = request.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!given) return false;
  // Usporedba sažetaka: jednaka duljina, bez curenja vremena.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

// ————————————————————————————————————————————————————————————————
// Vrijeme (Zagreb) — termini su lokalni sati, baza čuva UTC.
// ————————————————————————————————————————————————————————————————
function zagrebOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MEDIA_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

// "2026-11-17" + "19:30" (Zagreb) → Date (UTC trenutak).
export function zagrebSlotToDate(date: string, slot: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(MEDIA_SLOTS as readonly string[]).includes(slot)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = slot.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  // Dva prolaza pokrivaju prijelaz na ljetno/zimsko računanje vremena.
  let t = new Date(guess.getTime() - zagrebOffsetMinutes(guess) * 60000);
  t = new Date(guess.getTime() - zagrebOffsetMinutes(t) * 60000);
  return t;
}

// Trenutni Zagreb datum ("2026-11-17") i sat ("19:30").
export function zagrebNow(at = new Date()): { date: string; hm: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEDIA_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  const hm = `${get("hour")}:${get("minute")}`;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hm, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

// Je li sad (Zagreb) unutar 25 min nakon jednog od termina? Cron se budi i u
// "krivom" UTC satu (zbog ljetnog/zimskog vremena) — tada NE dira bazu.
export function currentSlot(at = new Date()): MediaSlot | null {
  const { minutes } = zagrebNow(at);
  for (const s of MEDIA_SLOTS) {
    const [h, m] = s.split(":").map(Number);
    const start = h * 60 + m;
    if (minutes >= start && minutes < start + 25) return s;
  }
  return null;
}

// ————————————————————————————————————————————————————————————————
// Čišćenje ulaza od agenata (bez vanjskih biblioteka)
// ————————————————————————————————————————————————————————————————
const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
const oneOf = <T extends readonly string[]>(v: unknown, list: T): T[number] | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : null;
const score = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n * 10) / 10)) : undefined;
};
const httpUrl = (v: unknown): string | undefined => {
  const s = str(v, 1000);
  if (!s) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

// Slike za objavu smiju biti SAMO s naše domene ili našeg Bloba.
export function isOwnImageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    const siteHost = new URL(SITE_URL).hostname;
    return host === siteHost || host === `www.${siteHost}` || host.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function cleanImages(v: unknown): MediaImage[] {
  if (!Array.isArray(v)) return [];
  const out: MediaImage[] = [];
  for (const raw of v.slice(0, 10)) {
    const r = raw as Record<string, unknown>;
    const url = httpUrl(r?.url);
    if (!url || !isOwnImageUrl(url)) continue;
    out.push({
      url,
      source: oneOf(r?.source, IMAGE_SOURCES) || "NONE",
      credit: str(r?.credit, 200) || undefined,
      license: str(r?.license, 80) || undefined,
      link: httpUrl(r?.link)
    });
  }
  return out;
}

function cleanSources(v: unknown): MediaSource[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 15)
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      const label = str(r?.label, 160) || str(r?.url, 160);
      return label ? { label, url: httpUrl(r?.url) } : null;
    })
    .filter(Boolean) as MediaSource[];
}

function cleanScores(v: unknown): MediaScores | undefined {
  if (!v || typeof v !== "object") return undefined;
  const r = v as Record<string, unknown>;
  return { dijeljenje: score(r.dijeljenje), komentari: score(r.komentari), emocija: score(r.emocija), hr: score(r.hr), ukupno: score(r.ukupno) };
}

export type CleanIngestItem = Omit<Prisma.MediaItemCreateInput, "runDate"> & { extKey: string };

// Vrati očišćenu stavku ili poruku greške.
export function cleanIngestItem(raw: unknown): { ok: true; item: CleanIngestItem } | { ok: false; error: string } {
  const r = (raw || {}) as Record<string, unknown>;
  const extKey = str(r.extKey, 120);
  const kind = oneOf(r.kind, MEDIA_KINDS);
  const title = str(r.title, 300);
  if (!extKey || !/^[A-Za-z0-9._:-]+$/.test(extKey)) return { ok: false, error: "extKey nedostaje ili ima nedozvoljene znakove" };
  if (!kind) return { ok: false, error: `${extKey}: kind mora biti BRIEF, IDEA ili DRAFT` };
  if (!title) return { ok: false, error: `${extKey}: nedostaje title` };
  const format = oneOf(r.format, MEDIA_FORMATS);
  if (kind === "DRAFT" && !format) return { ok: false, error: `${extKey}: nacrt treba format (FEED_IMAGE, CAROUSEL ili STORY_MANUAL)` };
  const slot = oneOf(r.suggestedSlot, MEDIA_SLOTS);
  return {
    ok: true,
    item: {
      extKey,
      kind,
      title,
      series: str(r.series, 80),
      format,
      summary: str(r.summary, 4000),
      caption: str(r.caption, 2200), // Instagram limit
      verification: oneOf(r.verification, VERIFICATIONS),
      scores: (cleanScores(r.scores) as Prisma.InputJsonValue) ?? undefined,
      sources: cleanSources(r.sources) as unknown as Prisma.InputJsonValue,
      images: cleanImages(r.images) as unknown as Prisma.InputJsonValue,
      notes: str(r.notes, 4000),
      manualSteps: str(r.manualSteps, 2000),
      data: r.data && typeof r.data === "object" ? (JSON.parse(JSON.stringify(r.data).slice(0, 20000)) as Prisma.InputJsonValue) : undefined,
      ideaKey: str(r.ideaKey, 120),
      suggestedSlot: slot
    }
  };
}

// ————————————————————————————————————————————————————————————————
// Objava jedne stavke na Instagram (sada). Vrati novo stanje za bazu.
// ————————————————————————————————————————————————————————————————
export function itemImages(item: Pick<MediaItem, "images">): MediaImage[] {
  return Array.isArray(item.images) ? (item.images as unknown as MediaImage[]).filter((i) => i && typeof i.url === "string") : [];
}

export async function publishMediaItem(item: MediaItem): Promise<{ ok: true; id?: string; permalink?: string } | { ok: false; error: string }> {
  if (item.kind !== "DRAFT") return { ok: false, error: "Objaviti se može samo nacrt." };
  if (item.format === "STORY_MANUAL") return { ok: false, error: "Story s anketom/kvizom objavljuješ ručno u Instagramu." };
  const caption = (item.caption || "").trim();
  if (!caption) return { ok: false, error: "Nacrt nema opis (caption)." };
  const imgs = itemImages(item).filter((i) => isOwnImageUrl(i.url));
  if (imgs.length === 0) return { ok: false, error: "Nacrt nema sliku. Dodaj je gumbom „Učitaj svoju“." };
  if (imgs.some((i) => !/\.jpe?g($|\?)/i.test(i.url))) return { ok: false, error: "Instagram prima samo JPEG slike." };

  if (item.format === "CAROUSEL" && imgs.length >= 2) {
    const r = await publishCarousel({ imageUrls: imgs.slice(0, 10).map((i) => i.url), caption });
    return r.ok ? { ok: true, id: r.id, permalink: r.permalink } : { ok: false, error: r.error || "Objava nije uspjela." };
  }
  const r = await publishImage({ imageUrl: imgs[0].url, caption });
  return r.ok ? { ok: true, id: r.id, permalink: r.permalink } : { ok: false, error: r.error || "Objava nije uspjela." };
}

// Objava koja je "zapela" (funkcija prekinuta usred objave) → NEUSPJELO, uz upozorenje
// da se prije ponovne objave provjeri Instagram (možda je ipak izašla).
export async function releaseStuckPublishing() {
  await prisma.mediaItem.updateMany({
    where: { status: "OBJAVLJUJEM", updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    data: { status: "NEUSPJELO", error: "Objava je prekinuta. Prije ponovne objave provjeri na Instagramu je li ipak izašla." }
  });
}
