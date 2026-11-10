import { NextResponse } from "next/server";

import { requireAction } from "@/lib/admin-auth";
import { createReelContainer, finishReel } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isOurBlob = (u: string) => {
  try {
    const x = new URL(u);
    return x.hostname.endsWith(".blob.vercel-storage.com") && x.pathname.startsWith("/reklame/");
  } catch {
    return false;
  }
};

// Korak 1: pošalji video Instagramu (container). Samo vlasnik — javna objava.
export async function POST(request: Request) {
  if (!(await requireAction("settings"))) {
    return NextResponse.json({ ok: false, message: "Samo vlasnik može objavljivati na Instagram." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const videoUrl = String(body?.videoUrl || "").trim();
  const caption = String(body?.caption || "").trim();
  if (!isOurBlob(videoUrl)) return NextResponse.json({ ok: false, message: "Video mora biti iz biblioteke reklama." }, { status: 400 });
  if (!/\.(mp4|mov)($|\?)/i.test(videoUrl)) return NextResponse.json({ ok: false, message: "Instagram reel mora biti video (MP4/MOV)." }, { status: 400 });
  if (!caption) return NextResponse.json({ ok: false, message: "Upiši opis (caption)." }, { status: 400 });
  const r = await createReelContainer({ videoUrl, caption });
  if (!r.ok) return NextResponse.json({ ok: false, message: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, containerId: r.id });
}

// Korak 2 (preglednik zove svakih par sekundi): ako je IG obradio video → objavi.
export async function GET(request: Request) {
  if (!(await requireAction("settings"))) return NextResponse.json({ ok: false }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^\d+$/.test(id)) return NextResponse.json({ ok: false, message: "Neispravan id." }, { status: 400 });
  const r = await finishReel(id);
  if (!r.ok) return NextResponse.json({ ok: false, message: r.error }, { status: 502 });
  return NextResponse.json(r);
}
