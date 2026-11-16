import { NextResponse } from "next/server";

import { cleanIngestItem, verifyIngestKey } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { sendPushToOwners } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ulaz za jutarnju rutinu (lokalni agenti na Igorovom Macu).
// Authorization: Bearer <MEDIA_INGEST_SECRET> — zaseban ključ koji ne otvara ništa drugo.
// Tijelo: { runDate: "2026-11-17", notify?: true, items: [ { extKey, kind, title, … } ] }
// Ponovno slanje istog extKey AŽURIRA stavku dok je Igor još nije odlučio (NOVO/VRACENO);
// odlučene stavke (zakazane, objavljene, odbijene) agent više ne može mijenjati.
export async function POST(request: Request) {
  if (!verifyIngestKey(request)) return NextResponse.json({ ok: false, message: "Neispravan ključ." }, { status: 401 });

  const raw = await request.text();
  if (raw.length > 400_000) return NextResponse.json({ ok: false, message: "Prevelik zahtjev." }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, message: "Tijelo nije JSON." }, { status: 400 });
  }

  const runDate = typeof body.runDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.runDate) ? body.runDate : null;
  if (!runDate) return NextResponse.json({ ok: false, message: "runDate mora biti YYYY-MM-DD." }, { status: 400 });
  const list = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  if (list.length === 0) return NextResponse.json({ ok: false, message: "Nema stavki." }, { status: 400 });

  const errors: string[] = [];
  const saved: { extKey: string; id: string; action: "created" | "updated" | "locked" }[] = [];

  for (const rawItem of list) {
    const c = cleanIngestItem(rawItem);
    if (!c.ok) {
      errors.push(c.error);
      continue;
    }
    const { extKey, ...fields } = c.item;
    try {
      const existing = await prisma.mediaItem.findUnique({ where: { extKey }, select: { id: true, status: true, decidedBy: true, rating: true } });
      if (!existing) {
        const created = await prisma.mediaItem.create({ data: { ...fields, extKey, runDate } });
        saved.push({ extKey, id: created.id, action: "created" });
      } else if (existing.status === "VRACENO" || (existing.status === "NOVO" && !existing.decidedBy && !existing.rating)) {
        // Nova verzija: nakon "Vrati agentu", ili nacrt koji Igor još nije ni ocijenio ni dirao.
        // decidedBy se briše da nova verzija opet bude "neviđena"; ocjena ostaje za povijest.
        await prisma.mediaItem.update({ where: { id: existing.id }, data: { ...fields, runDate, status: "NOVO", error: null, decidedBy: null } });
        saved.push({ extKey, id: existing.id, action: "updated" });
      } else {
        // Igor ga je već ocijenio, uredio, zakazao ili objavio → agent ga ne smije mijenjati.
        saved.push({ extKey, id: existing.id, action: "locked" });
      }
    } catch (e) {
      errors.push(`${extKey}: spremanje nije uspjelo (${e instanceof Error ? e.message.slice(0, 120) : "greška"})`);
    }
  }

  // Jedan push po jutru (agent šalje notify:true samo u zadnjem pozivu).
  if (body.notify === true) {
    const drafts = await prisma.mediaItem.count({ where: { runDate, kind: "DRAFT", status: "NOVO" } });
    const ideas = await prisma.mediaItem.count({ where: { runDate, kind: "IDEA" } });
    const top = await prisma.mediaItem.findFirst({ where: { runDate, kind: "IDEA" }, orderBy: { createdAt: "asc" }, select: { title: true } });
    await sendPushToOwners({
      title: "☀️ Jutarnji pregled",
      body: `${ideas} ${ideas === 1 ? "tema" : "teme"}, ${drafts} ${drafts === 1 ? "nacrt čeka" : "nacrta čekaju"} ocjenu${top ? `. Top: ${top.title.slice(0, 70)}` : ""}`,
      url: "/admin/media/",
      tag: `media-${runDate}`,
      kind: "media"
    }).catch(() => null);
  }

  return NextResponse.json({ ok: errors.length === 0, saved, errors });
}
