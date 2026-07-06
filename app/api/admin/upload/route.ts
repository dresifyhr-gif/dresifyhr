import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

// Uploads an image to Vercel Blob (public) and returns its URL.
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, message: "Blob nije spojen (nema BLOB_READ_WRITE_TOKEN)." }, { status: 500 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "Nema datoteke." }, { status: 400 });
  if (!OK_TYPES.includes(file.type)) return NextResponse.json({ ok: false, message: "Dozvoljene su samo slike (JPG/PNG/WebP)." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: "Slika je prevelika (max 8 MB)." }, { status: 400 });

  const slug = String(form?.get("slug") || "misc").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";

  const blob = await put(`products/${slug}/${Date.now()}.${ext}`, file, { access: "public", addRandomSuffix: true });

  return NextResponse.json({ ok: true, url: blob.url });
}
