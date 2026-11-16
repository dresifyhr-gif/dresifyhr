import { NextResponse } from "next/server";

import { requireAction } from "@/lib/admin-auth";
import { MEDIA_TEAM } from "@/lib/media-team";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THREADS = new Set(["tim", ...MEDIA_TEAM.map((m) => m.id)]);

// Igor piše članu tima (ili cijelom timu). Rutina je pročita sutra u 6:00.
// POST { member, body }  ·  PATCH { member } → odgovore u tom razgovoru označi pročitanima
export async function POST(request: Request) {
  const user = await requireAction("owner");
  if (!user) return NextResponse.json({ ok: false, message: "Samo vlasnik piše timu." }, { status: 403 });
  const b = ((await request.json().catch(() => ({}))) || {}) as { member?: string; body?: string };
  const member = String(b.member || "");
  const text = String(b.body || "").trim().slice(0, 2000);
  if (!THREADS.has(member)) return NextResponse.json({ ok: false, message: "Nepoznat član tima." }, { status: 400 });
  if (!text) return NextResponse.json({ ok: false, message: "Poruka je prazna." }, { status: 400 });
  const message = await prisma.mediaMessage.create({ data: { member, fromIgor: true, author: user.username, body: text } });
  return NextResponse.json({ ok: true, message });
}

export async function PATCH(request: Request) {
  const user = await requireAction("owner");
  if (!user) return NextResponse.json({ ok: false }, { status: 403 });
  const b = ((await request.json().catch(() => ({}))) || {}) as { member?: string };
  const member = String(b.member || "");
  if (!THREADS.has(member)) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.mediaMessage.updateMany({ where: { member, fromIgor: false, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
