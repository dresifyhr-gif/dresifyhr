import { NextResponse } from "next/server";

import { verifyIngestKey } from "@/lib/media";
import { MEDIA_TEAM, memberOf } from "@/lib/media-team";
import { prisma } from "@/lib/prisma";
import { sendPushToOwners } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THREADS = new Set(["tim", ...MEDIA_TEAM.map((m) => m.id)]);

// Za jutarnju rutinu (isti zaseban ključ kao ingest).
// GET  → nepročitane Igorove poruke + zadnjih 30 dana razgovora (kontekst)
// POST { replies: [{ member, body, author? }], read: [id…] } → odgovori + označi pročitano; 1 push Igoru
export async function GET(request: Request) {
  if (!verifyIngestKey(request)) return NextResponse.json({ ok: false, message: "Neispravan ključ." }, { status: 401 });
  const since = new Date(Date.now() - 30 * 86400_000);
  const [unread, history] = await Promise.all([
    prisma.mediaMessage.findMany({ where: { fromIgor: true, readAt: null }, orderBy: { createdAt: "asc" }, take: 100 }),
    prisma.mediaMessage.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "asc" }, take: 400 })
  ]);
  return NextResponse.json({ ok: true, unread, history });
}

export async function POST(request: Request) {
  if (!verifyIngestKey(request)) return NextResponse.json({ ok: false, message: "Neispravan ključ." }, { status: 401 });
  const b = ((await request.json().catch(() => ({}))) || {}) as { replies?: unknown[]; read?: unknown[] };
  const replies = (Array.isArray(b.replies) ? b.replies : []).slice(0, 30) as { member?: string; body?: string; author?: string }[];
  const read = (Array.isArray(b.read) ? b.read : []).filter((x): x is string => typeof x === "string").slice(0, 200);

  const errors: string[] = [];
  let saved = 0;
  const who = new Set<string>();
  for (const r of replies) {
    const member = String(r?.member || "");
    const text = String(r?.body || "").trim().slice(0, 3000);
    if (!THREADS.has(member) || !text) {
      errors.push(`preskočeno: ${member || "—"} (nepoznat član ili prazno)`);
      continue;
    }
    const author = String(r.author || memberOf(member)?.name || "Luka").slice(0, 40);
    await prisma.mediaMessage.create({ data: { member, fromIgor: false, author, body: text } });
    who.add(author);
    saved++;
  }
  if (read.length) await prisma.mediaMessage.updateMany({ where: { id: { in: read }, fromIgor: true, readAt: null }, data: { readAt: new Date() } });

  if (saved) {
    const names = Array.from(who);
    await sendPushToOwners({
      title: "💬 Tim ti je odgovorio",
      body: `${names.slice(0, 3).join(", ")}${names.length > 3 ? " i drugi" : ""} — pogledaj u Redakciji`,
      url: "/admin/media/?tab=redakcija",
      tag: `media-poruke-${new Date().toISOString().slice(0, 10)}`,
      kind: "media"
    }).catch(() => null);
  }
  return NextResponse.json({ ok: errors.length === 0, saved, read: read.length, errors });
}
