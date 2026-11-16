import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import { requireAction } from "@/lib/admin-auth";
import { MEDIA_SLOTS, isOwnImageUrl, publishMediaItem, publishProblem, zagrebSlotToDate, type MediaImage } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // objava carousela/reela čeka obradu na Instagramu

type Body = {
  action?: string;
  rating?: number;
  comment?: string;
  caption?: string;
  title?: string;
  date?: string;
  slot?: string;
  images?: MediaImage[];
  permalink?: string;
  updatedAt?: string; // verzija koju je Igor vidio (zaštita od tihe zamjene sadržaja)
};

const LOCKED = ["OBJAVLJENO", "OBJAVLJUJEM"];
// Radnje koje mijenjaju ili objavljuju SADRŽAJ: smiju samo nad verzijom koju je Igor vidio.
const NEEDS_SEEN_VERSION = ["edit", "images", "schedule", "publish"];

// Sve odluke o nacrtima donosi SAMO vlasnik (Igor): ocjena, uređivanje, odobri,
// zakaži, objavi, vrati agentu, odbij, slike.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAction("owner");
  if (!user) return NextResponse.json({ ok: false, message: "Samo vlasnik odlučuje o objavama." }, { status: 403 });

  const item = await prisma.mediaItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ ok: false, message: "Stavka ne postoji." }, { status: 404 });

  const body = ((await request.json().catch(() => ({}))) || {}) as Body;
  const by = user.username;

  // Agent je mogao poslati novu verziju dok je Igor gledao staru: tada NE objavljuj/zakazuj
  // naslijepo, nego traži osvježavanje (409).
  if (NEEDS_SEEN_VERSION.includes(String(body.action))) {
    const seen = body.updatedAt ? new Date(body.updatedAt).getTime() : NaN;
    if (!Number.isFinite(seen) || seen !== item.updatedAt.getTime()) {
      return NextResponse.json({ ok: false, stale: true, message: "Nacrt se u međuvremenu promijenio. Osvježi stranicu i pogledaj novu verziju." }, { status: 409 });
    }
  }
  let data: Prisma.MediaItemUpdateInput | null = null;

  switch (body.action) {
    case "rate": {
      const r = Number(body.rating);
      if (![1, 2, 3, 4].includes(r)) return NextResponse.json({ ok: false, message: "Ocjena mora biti 1–4." }, { status: 400 });
      data = { rating: r, ratingComment: (body.comment || "").trim().slice(0, 2000) || null, ratedAt: new Date() };
      break;
    }
    case "comment": {
      data = { ratingComment: (body.comment || "").trim().slice(0, 2000) || null, ratedAt: new Date() };
      break;
    }
    case "edit": {
      if (LOCKED.includes(item.status)) return NextResponse.json({ ok: false, message: "Objavljeno se ne može mijenjati." }, { status: 409 });
      const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 2200) : undefined;
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : undefined;
      // decidedBy: Igor je dirao sadržaj → agent ga više ne smije prepisati.
      data = { ...(caption !== undefined ? { caption } : {}), ...(title ? { title } : {}), decidedBy: by };
      break;
    }
    case "images": {
      if (LOCKED.includes(item.status)) return NextResponse.json({ ok: false, message: "Objavljeno se ne može mijenjati." }, { status: 409 });
      const imgs = (Array.isArray(body.images) ? body.images : [])
        .filter((i) => i && typeof i.url === "string" && isOwnImageUrl(i.url))
        .slice(0, 10)
        .map((i) => ({
          url: i.url,
          source: ["COMMONS", "AI", "DRESIFY", "UPLOAD", "NONE"].includes(i.source) ? i.source : "UPLOAD",
          credit: typeof i.credit === "string" ? i.credit.slice(0, 200) : undefined,
          license: typeof i.license === "string" ? i.license.slice(0, 80) : undefined,
          link: typeof i.link === "string" ? i.link.slice(0, 1000) : undefined
        }));
      if (Array.isArray(body.images) && body.images.length > 10)
        return NextResponse.json({ ok: false, message: "Carousel može imati najviše 10 slika." }, { status: 400 });
      data = { images: imgs as unknown as Prisma.InputJsonValue, decidedBy: by };
      break;
    }
    case "schedule": {
      if (item.kind !== "DRAFT" || item.format === "STORY_MANUAL")
        return NextResponse.json({ ok: false, message: "Zakazati se može samo nacrt za feed (story objavljuješ ručno)." }, { status: 400 });
      if (LOCKED.includes(item.status)) return NextResponse.json({ ok: false, message: "Već je objavljeno." }, { status: 409 });
      const slot = String(body.slot || "");
      const at = zagrebSlotToDate(String(body.date || ""), slot);
      if (!at || !(MEDIA_SLOTS as readonly string[]).includes(slot))
        return NextResponse.json({ ok: false, message: "Izaberi datum i termin (12:00, 18:00, 19:30 ili 21:00)." }, { status: 400 });
      if (at.getTime() < Date.now() + 60_000) return NextResponse.json({ ok: false, message: "Taj termin je već prošao. Izaberi kasniji." }, { status: 400 });
      const problem = publishProblem(item);
      if (problem) return NextResponse.json({ ok: false, message: problem }, { status: 400 });
      data = { status: "ZAKAZANO", scheduledAt: at, decidedBy: by, error: null };
      break;
    }
    case "unschedule": {
      if (item.status !== "ZAKAZANO") return NextResponse.json({ ok: false, message: "Nije zakazano." }, { status: 400 });
      data = { status: "NOVO", scheduledAt: null };
      break;
    }
    case "publish": {
      if (LOCKED.includes(item.status)) return NextResponse.json({ ok: false, message: "Već je objavljeno." }, { status: 409 });
      // Zaštita od dvostrukog klika: "uzmi" stavku atomski prije objave.
      const claimed = await prisma.mediaItem.updateMany({
        where: { id: item.id, status: { in: ["NOVO", "ZAKAZANO", "NEUSPJELO", "VRACENO"] }, igMediaId: null, updatedAt: item.updatedAt },
        data: { status: "OBJAVLJUJEM" }
      });
      if (claimed.count === 0) return NextResponse.json({ ok: false, message: "Objava je već u tijeku." }, { status: 409 });
      const r = await publishMediaItem(item);
      const updated = await prisma.mediaItem.update({
        where: { id: item.id },
        data: r.ok
          ? { status: "OBJAVLJENO", publishedAt: new Date(), igMediaId: r.id || null, permalink: r.permalink || null, decidedBy: by, error: null }
          : { status: "NEUSPJELO", error: r.error }
      });
      return NextResponse.json({ ok: r.ok, message: r.ok ? "Objavljeno na Instagram." : r.error, item: updated }, { status: r.ok ? 200 : 502 });
    }
    case "markPublished": {
      if (item.status === "OBJAVLJUJEM") return NextResponse.json({ ok: false, message: "Objava je u tijeku." }, { status: 409 });
      // Za story s naljepnicom (objavljen ručno u Instagramu) — da arhiva bude točna.
      const permalink = typeof body.permalink === "string" && /^https:\/\/(www\.)?instagram\.com\//.test(body.permalink) ? body.permalink : null;
      data = { status: "OBJAVLJENO", publishedAt: new Date(), permalink, decidedBy: by, error: null };
      break;
    }
    case "return": {
      if (LOCKED.includes(item.status)) return NextResponse.json({ ok: false, message: "Već je objavljeno." }, { status: 409 });
      const comment = (body.comment || "").trim().slice(0, 2000);
      if (!comment) return NextResponse.json({ ok: false, message: "Napiši agentu što da promijeni." }, { status: 400 });
      data = { status: "VRACENO", ratingComment: comment, ratedAt: new Date(), scheduledAt: null, decidedBy: by };
      break;
    }
    case "reject": {
      if (LOCKED.includes(item.status)) return NextResponse.json({ ok: false, message: "Već je objavljeno." }, { status: 409 });
      data = { status: "ODBIJENO", scheduledAt: null, decidedBy: by };
      break;
    }
    case "restore": {
      if (item.status !== "ODBIJENO" && item.status !== "NEUSPJELO") return NextResponse.json({ ok: false, message: "Nema što vratiti." }, { status: 400 });
      data = { status: "NOVO", error: null };
      break;
    }
    default:
      return NextResponse.json({ ok: false, message: "Nepoznata radnja." }, { status: 400 });
  }

  const updated = await prisma.mediaItem.update({ where: { id: item.id }, data: data! });
  return NextResponse.json({ ok: true, item: updated });
}
