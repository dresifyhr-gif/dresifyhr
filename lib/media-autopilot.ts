import "server-only";

import type { MediaItem } from "@prisma/client";

import { MEDIA_SLOTS, isOwnImageUrl, itemImages, publishProblem, zagrebNow, zagrebSlotToDate } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { sendPushToOwners } from "@/lib/push";

// AUTOPILOT — automatska objava BEZ Igorova klika, ali samo kad je SVE sigurno.
// Zadano ISKLJUČEN. Dvostruka zaštita:
//  1) strogi agent-urednik (lokalno, na Macu) ponovno provjeri činjenice (2 nezavisna
//     izvora), licencu slike, ton i ponavljanje → autoCheck.passed;
//  2) server ovdje DODATNO provjerava pravila koja se mogu provjeriti strojno.
// Bilo što ne prođe → nacrt NE ide sam, nego čeka Igora (i zapišemo zašto).
// Ujutro push "Danas u X izlazi Y — Pogledaj / Zaustavi"; ako ga ne zaustavi, cron objavi.

// Serije koje smiju same; vijesti/transferi samo s POTVRĐENO, glasine nikad.
const AUTO_SERIES: Record<string, string[]> = {
  "Na današnji dan": ["POTVRĐENO"],
  "Zaboravljeni talent": ["POTVRĐENO"],
  "Pogodi igrača": ["POTVRĐENO"],
  Kviz: ["POTVRĐENO"],
  Rasprava: ["POTVRĐENO", "MIŠLJENJE"],
  Vijest: ["POTVRĐENO"],
  Transfer: ["POTVRĐENO"]
};
const AUTO_FORMATS = ["FEED_IMAGE", "CAROUSEL"]; // Reels (trending zvuk), story, TikTok, kanal ostaju ručni

// Grubi strojni filtar za politiku/huškanje (urednik je prva linija; ovo je osigurač).
const BANNED = [
  /\bHDZ\b/i, /\bSDP\b/i, /\bthompson/i, /\busta[šs]/i, /\bčetni/i, /\bcetni/i, /za dom spremni/i, /\bpremijer/i,
  /\bizbor(i|ima)\b/i, /\bvlad[ae]\b/i, /\brat(a|u)?\b/i, /\bNDH\b/i, /\bklađ/i, /\bkoeficijent/i
];

const EMOJI_RE = new RegExp("\\p{Extended_Pictographic}", "gu");

export type AutoSettings = { autopilot: boolean; maxPerDay: number; autoSlots: string[] };

export async function getMediaSettings(): Promise<AutoSettings> {
  const s = await prisma.mediaSettings.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const slots = (s?.autoSlots || "19:30,12:00")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => (MEDIA_SLOTS as readonly string[]).includes(x));
  return { autopilot: Boolean(s?.autopilot), maxPerDay: Math.max(1, Math.min(2, s?.maxPerDay ?? 1)), autoSlots: slots.length ? slots : ["19:30"] };
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

function similar(a: string, b: string) {
  const A = new Set(norm(a));
  const B = new Set(norm(b));
  if (A.size === 0 || B.size === 0) return 0;
  let n = 0;
  A.forEach((w) => {
    if (B.has(w)) n++;
  });
  return n / Math.min(A.size, B.size);
}

type AutoCheck = { passed?: boolean; facts?: string; license?: string; tone?: string; repeat?: string; reasons?: string[] };

// Može li nacrt ići automatski? Vrati popis razloga zašto NE (prazno = može).
export async function autopilotBlockers(item: MediaItem): Promise<string[]> {
  const why: string[] = [];
  if (item.kind !== "DRAFT") why.push("nije nacrt");
  if (!AUTO_FORMATS.includes(item.format || "")) why.push("format ostaje ručni (Reel, story, TikTok, kanal)");
  const allowed = AUTO_SERIES[item.series || ""];
  if (!allowed) why.push(`serija "${item.series || "—"}" ne ide automatski`);
  else if (!allowed.includes(item.verification || "")) why.push(`provjera je "${item.verification || "—"}" (treba POTVRĐENO)`);
  if (item.rating !== null && item.rating <= 2) why.push("ocijenio si ga Prosječno/Loše");
  const p = publishProblem(item);
  if (p) why.push(p);

  const c = (item.autoCheck || {}) as AutoCheck;
  if (c.passed !== true) why.push(`urednik nije odobrio${c.reasons?.length ? `: ${c.reasons.join("; ")}` : ""}`);
  for (const k of ["facts", "license", "tone", "repeat"] as const) if (c[k] && c[k] !== "OK") why.push(`urednik (${k}): ${c[k]}`);

  for (const im of itemImages(item)) {
    if (!isOwnImageUrl(im.url)) why.push("slika nije s naše domene");
    if (im.source === "COMMONS" && (!im.credit || !im.license || !im.link)) why.push("Commons slika bez autora, licence ili linka");
    if (im.source === "UPLOAD") why.push("tvoja slika — licencu ne možemo provjeriti");
  }
  const text = `${item.title}\n${item.caption || ""}`;
  if (BANNED.some((re) => re.test(text))) why.push("tekst dira politiku ili klađenje");
  if (((item.caption || "").match(EMOJI_RE) || []).length > 2) why.push("više od 2 emojija");

  // Ponavljanje teme: slično objavljenom/zakazanom u zadnjih 60 dana.
  const recent = await prisma.mediaItem.findMany({
    where: { id: { not: item.id }, kind: "DRAFT", status: { in: ["OBJAVLJENO", "ZAKAZANO", "OBJAVLJUJEM"] }, updatedAt: { gte: new Date(Date.now() - 60 * 86400_000) } },
    select: { title: true }
  });
  if (recent.some((r) => similar(r.title, item.title) >= 0.6)) why.push("slična tema već je objavljena ili zakazana");
  return Array.from(new Set(why));
}

// Rasporedi prihvatljive nacrte u slobodne autopilot termine (danas, inače sutra).
// Zove se nakon jutarnjeg slanja i kad Igor uključi autopilot.
export async function runAutopilot(runDate: string): Promise<{ scheduled: string[]; held: { id: string; title: string; why: string[] }[] }> {
  const cfg = await getMediaSettings();
  const out = { scheduled: [] as string[], held: [] as { id: string; title: string; why: string[] }[] };
  if (!cfg.autopilot) return out;

  const candidates = await prisma.mediaItem.findMany({
    where: { runDate, kind: "DRAFT", status: "NOVO", format: { in: AUTO_FORMATS } },
    orderBy: { createdAt: "asc" }
  });
  // Najbolje ocijenjena ideja prva.
  const ideas = await prisma.mediaItem.findMany({ where: { runDate, kind: "IDEA" }, select: { extKey: true, scores: true } });
  const score = (it: MediaItem) => {
    const idea = ideas.find((i) => i.extKey && i.extKey === it.ideaKey);
    const s = (idea?.scores || it.scores || {}) as { ukupno?: number };
    return s.ukupno ?? 0;
  };
  candidates.sort((a, b) => score(b) - score(a));

  const today = zagrebNow().date;
  const tomorrow = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10) + 1, 12)).toISOString().slice(0, 10);

  for (const item of candidates) {
    const why = await autopilotBlockers(item);
    if (why.length) {
      out.held.push({ id: item.id, title: item.title, why });
      await prisma.mediaItem.update({ where: { id: item.id }, data: { error: `Autopilot ga NIJE zakazao: ${why.join("; ")}. Čeka tebe.` } });
      continue;
    }
    let placed: { at: Date; slot: string } | null = null;
    for (const day of [today, tomorrow]) {
      const dayStart = zagrebSlotToDate(day, "12:00")!.getTime() - 12 * 3600_000;
      const dayEnd = dayStart + 24 * 3600_000;
      const taken = await prisma.mediaItem.findMany({
        where: { kind: "DRAFT", status: { in: ["ZAKAZANO", "OBJAVLJUJEM", "OBJAVLJENO"] }, scheduledAt: { gte: new Date(dayStart), lt: new Date(dayEnd) } },
        select: { scheduledAt: true, autopilot: true }
      });
      if (taken.filter((t) => t.autopilot).length >= cfg.maxPerDay) continue;
      for (const slot of cfg.autoSlots) {
        const at = zagrebSlotToDate(day, slot)!;
        if (at.getTime() < Date.now() + 90 * 60_000) continue; // barem 90 min za "Zaustavi"
        if (taken.some((t) => t.scheduledAt && Math.abs(t.scheduledAt.getTime() - at.getTime()) < 60_000)) continue;
        placed = { at, slot };
        break;
      }
      if (placed) break;
    }
    if (!placed) {
      out.held.push({ id: item.id, title: item.title, why: ["nema slobodnog autopilot termina danas ni sutra"] });
      continue;
    }
    const claimed = await prisma.mediaItem.updateMany({
      where: { id: item.id, status: "NOVO", updatedAt: item.updatedAt },
      data: { status: "ZAKAZANO", scheduledAt: placed.at, autopilot: true, decidedBy: "AUTOPILOT", error: null }
    });
    if (claimed.count === 0) continue;
    out.scheduled.push(item.id);
    const when = zagrebNow(placed.at).date === today ? `Danas u ${placed.slot}` : `Sutra u ${placed.slot}`;
    await sendPushToOwners({
      title: `🤖 ${when} izlazi objava`,
      body: `${item.title.slice(0, 90)} — dodirni za Pogledaj ili Zaustavi`,
      url: `/admin/media/?tab=kalendar&item=${item.id}`,
      tag: `autopilot-${item.id}`,
      kind: "autopilot",
      itemId: item.id
    }).catch(() => null);
  }
  return out;
}
