import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getOrderReference } from "@/lib/orders";

export const runtime = "nodejs";

// Ručni unos narudžbe (npr. narudžba s Instagrama). Kreira narudžbu + artikle,
// upiše kupca. Ulazi u sve zbrojeve (promet, prikupljeno) kao i web narudžbe.
type ItemIn = { klub?: string; igrac?: string; size?: string; unitPrice?: number | string };

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.customerName === "string" ? body.customerName.trim() : "";
  if (!name) return NextResponse.json({ ok: false, message: "Ime je obavezno" }, { status: 400 });

  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  const itemsIn: ItemIn[] = Array.isArray(body?.items) ? body.items : [];
  const items = itemsIn
    .map((it) => ({
      klub: (it.klub || "").toString().trim(),
      igrac: (it.igrac || "").toString().trim(),
      size: (it.size || "").toString().trim(),
      unitPrice: Number(String(it.unitPrice ?? "").toString().replace(",", ".")) || 0
    }))
    .filter((it) => it.klub || it.igrac || it.unitPrice > 0);
  if (items.length === 0) return NextResponse.json({ ok: false, message: "Dodaj barem jedan artikl" }, { status: 400 });

  const shipping = Math.max(0, Number(String(body?.shipping ?? "0").replace(",", ".")) || 0);
  const subtotal = items.reduce((s, it) => s + it.unitPrice, 0);
  const total = subtotal + shipping;
  const status = body?.status === "shipped" ? "shipped" : "new";
  const shippedBy = body?.shippedBy === "igor" || body?.shippedBy === "ivica" ? body.shippedBy : null;

  const createdAt = new Date();
  const reference = getOrderReference(createdAt.toISOString());

  try {
    // Kupac (best-effort, po telefonu).
    let customerId: string | null = null;
    if (phone) {
      const c = await prisma.customer.upsert({
        where: { phone },
        create: { phone, email: email || null, name, address: address || null, firstOrderAt: createdAt, lastOrderAt: createdAt, totalOrders: 1, totalSpent: total },
        update: { email: email || undefined, name, address: address || undefined, lastOrderAt: createdAt, totalOrders: { increment: 1 }, totalSpent: { increment: total } }
      });
      customerId = c.id;
    }

    const order = await prisma.order.create({
      data: {
        reference, createdAt,
        customerName: name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        channel: "instagram",
        fulfillment: "delivery",
        payment: "Pouzeće",
        subtotal, shipping, discount: 0, total,
        note: note || null,
        itemCount: items.length,
        status,
        shippedBy: status === "shipped" ? shippedBy : null,
        shippedAt: status === "shipped" ? createdAt : null,
        courier: status === "shipped" ? "gls" : null, // ručne narudžbe idu GLS-om kao i ostale
        customerId,
        items: { create: items.map((it) => ({ klub: it.klub || null, igrac: it.igrac || null, size: it.size || null, quantity: 1, unitPrice: it.unitPrice })) }
      }
    });

    return NextResponse.json({ ok: true, id: order.id, reference });
  } catch (error) {
    console.error("[admin] Failed to create manual order", error);
    return NextResponse.json({ ok: false, message: "Greška pri spremanju" }, { status: 500 });
  }
}
