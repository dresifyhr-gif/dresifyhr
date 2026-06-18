import { NextResponse } from "next/server";

import { deliverNewsletterSignup } from "@/lib/newsletter";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = `${body?.email ?? ""}`.trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, message: "Neispravna email adresa." }, { status: 400 });
    }

    const result = await deliverNewsletterSignup(email);

    // Even if no channel is configured, don't fail the visitor — just accept it.
    return NextResponse.json({ ok: true, delivered: result.delivered });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Greška pri prijavi. Pokušaj ponovno." },
      { status: 500 }
    );
  }
}
