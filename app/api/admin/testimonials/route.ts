import { NextResponse } from "next/server";

import { isAdmin, requireAction } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const testimonials = await prisma.testimonial.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json({ ok: true, testimonials });
}

export async function POST(request: Request) {
  if (!(await requireAction("settings"))) return NextResponse.json({ ok: false }, { status: 401 });

  const b = await request.json().catch(() => ({}));
  const imageUrl = String(b?.imageUrl || "").trim();
  if (!imageUrl) return NextResponse.json({ ok: false, message: "Dodaj sliku." }, { status: 400 });

  const data = {
    imageUrl,
    name: typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null,
    text: typeof b?.text === "string" && b.text.trim() ? b.text.trim() : null,
    hidden: b?.hidden === true,
    sort: Number.isFinite(Number(b?.sort)) ? Number(b.sort) : 0
  };

  if (typeof b?.id === "string" && b.id) {
    await prisma.testimonial.update({ where: { id: b.id }, data });
    return NextResponse.json({ ok: true, id: b.id });
  }
  const created = await prisma.testimonial.create({ data });
  return NextResponse.json({ ok: true, id: created.id });
}

export async function DELETE(request: Request) {
  if (!(await requireAction("settings"))) return NextResponse.json({ ok: false }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.testimonial.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
