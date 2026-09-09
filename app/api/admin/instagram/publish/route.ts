import { NextResponse } from "next/server";

import { requireAction } from "@/lib/admin-auth";
import { publishImage } from "@/lib/instagram";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Objava dresa na Instagram feed. Samo OWNER (javna objava je osjetljiva).
// Slika mora biti javno dostupan JPEG s naše domene (ili Vercel Blob).
export async function POST(request: Request) {
  if (!(await requireAction("settings"))) {
    return NextResponse.json({ ok: false, message: "Samo vlasnik može objavljivati na Instagram." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const rawImage = String(body?.imageUrl || "").trim();
  const caption = String(body?.caption || "").trim();
  if (!rawImage) return NextResponse.json({ ok: false, message: "Nedostaje slika proizvoda." }, { status: 400 });
  if (!caption) return NextResponse.json({ ok: false, message: "Nedostaje opis (caption)." }, { status: 400 });

  // Relativna /public putanja → apsolutni URL (isti obrazac kao facebook-feed).
  const imageUrl = rawImage.startsWith("http") ? rawImage : `${SITE_URL}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

  // Sigurnost: dopusti samo naše izvore (ne objavljuj proizvoljne vanjske slike).
  let host = "";
  try {
    host = new URL(imageUrl).hostname;
  } catch {
    return NextResponse.json({ ok: false, message: "Neispravan URL slike." }, { status: 400 });
  }
  const siteHost = (() => {
    try {
      return new URL(SITE_URL).hostname;
    } catch {
      return "dresifyshop.com";
    }
  })();
  const allowed = host === siteHost || host.endsWith(".blob.vercel-storage.com");
  if (!allowed) return NextResponse.json({ ok: false, message: "Slika mora biti s Dresify domene." }, { status: 400 });

  // Instagram feed prima SAMO JPEG.
  if (!/\.jpe?g($|\?)/i.test(imageUrl)) {
    return NextResponse.json(
      { ok: false, message: "Instagram prima samo JPEG slike. Ovaj proizvod nema .jpg sliku (dodaj JPEG u galeriju)." },
      { status: 400 }
    );
  }

  const result = await publishImage({ imageUrl, caption });
  if (!result.ok) return NextResponse.json({ ok: false, message: result.error || "Objava nije uspjela." }, { status: 502 });
  return NextResponse.json({ ok: true, id: result.id, permalink: result.permalink });
}
