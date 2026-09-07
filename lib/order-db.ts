import "server-only";

import { prisma } from "@/lib/prisma";
import { getOrderReference, type OrderPayload } from "@/lib/orders";

// Uskladi kupčeve totale kad narudžba promijeni "uspješnost" (povrat/otkaz i njihovo
// poništavanje). deltaSpent je u NETO robi (bez dostave). Best-effort, po telefonu.
export async function adjustCustomerTotals(phone: string | null | undefined, deltaSpent: number, deltaOrders: number) {
  const p = phone?.trim();
  if (!p) return;
  await prisma.customer
    .updateMany({ where: { phone: p }, data: { totalSpent: { increment: deltaSpent }, totalOrders: { increment: deltaOrders } } })
    .catch(() => {});
}

// Best-effort: mirror each order into Postgres for the admin dashboard + AI.
// Never throws, never blocks the order flow. No-ops if the DB isn't configured.
export async function saveOrderToDb(payload: OrderPayload) {
  if (!process.env.DATABASE_URL) {
    return { ok: false, skipped: true as const };
  }

  try {
    const address = [payload.street, payload.postalCode, payload.city].filter(Boolean).join(", ");
    const reference = getOrderReference(payload.createdAt);
    const createdAt = new Date(payload.createdAt);

    // Upsert the customer by phone (the most stable key we have).
    let customerId: string | null = null;
    const phone = payload.phone?.trim();
    // totalSpent prati NETO robu (bez dostave) — dostava nije potrošnja kupca.
    const netGoods = payload.total - (payload.shipping ?? 0);
    if (phone) {
      const customer = await prisma.customer.upsert({
        where: { phone },
        create: {
          phone,
          email: payload.email || null,
          name: payload.name || null,
          address: address || null,
          firstOrderAt: createdAt,
          lastOrderAt: createdAt,
          totalOrders: 1,
          totalSpent: netGoods
        },
        update: {
          email: payload.email || undefined,
          name: payload.name || undefined,
          address: address || undefined,
          lastOrderAt: createdAt,
          totalOrders: { increment: 1 },
          totalSpent: { increment: netGoods }
        }
      });
      customerId = customer.id;
    }

    await prisma.order.create({
      data: {
        reference,
        createdAt,
        customerName: payload.name,
        phone: phone || null,
        email: payload.email || null,
        address: address || null,
        channel: payload.contactChannel,
        fulfillment: payload.fulfillment,
        payment: payload.payment,
        ip: payload.ip || null,
        userId: payload.userId || null,
        igHandle: payload.igHandle || null,
        subtotal: payload.subtotal,
        shipping: payload.shipping,
        discount: payload.discount ?? 0,
        total: payload.total,
        promoCode: payload.promoCode || null,
        note: payload.note || null,
        itemCount: payload.itemCount,
        status: "new",
        customerId,
        items: {
          create: (payload.items ?? []).map((it) => ({
            slug: it.slug || null,
            klub: it.klub || null,
            igrac: it.igrac || null,
            size: it.size || null,
            segment: it.segment || null,
            quantity: 1,
            unitPrice: it.unitPrice
          }))
        }
      }
    });

    return { ok: true };
  } catch (error) {
    console.error("[db] Failed to save order to DB", error);
    return { ok: false };
  }
}
