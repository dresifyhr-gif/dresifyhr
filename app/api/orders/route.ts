import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { parseOrderPayload } from "@/lib/orders";
import { lookupPromo } from "@/lib/promo-db";
import { SHIPPING_PRICE_EUR, FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/site";
import { sendOrderNotifications } from "@/lib/notifications";
import { logOrderToSheet } from "@/lib/sheets";
import { saveOrderToDb } from "@/lib/order-db";
import { getProductBySlug } from "@/lib/data/product-overrides";
import { getJerseyBySlug, getJerseySizeOptions } from "@/lib/data/jerseys";
import { normalizeIgHandle, autoEnterGiveaway } from "@/lib/giveaway";

export const runtime = "nodejs";

// Serverska provjera dostupnosti pri narudžbi — da rasprodana veličina/segment
// NE prođe čak i ako je kupac imao staru (keširanu) stranicu otvorenu. Čita ažurno
// stanje (keš override-a se briše na revalidateTag("products") čim admin spremi).
// Fail-open: ako provjera pukne, ne blokira narudžbu (nikad ne rušimo prodaju).
async function findUnavailableItems(items: { slug: string; klub: string; igrac: string; size: string }[]) {
  const bad: string[] = [];
  for (const it of items) {
    if (!it.slug || !it.size) continue; // ručne stavke / bez veličine — preskoči
    try {
      const product = await getProductBySlug(it.slug, getJerseyBySlug(it.slug));
      if (!product) continue; // nepoznat slug — ne blokiraj
      const opts = getJerseySizeOptions(product);
      const isAdultSize = (opts.adults as readonly string[]).includes(it.size);
      const isKidSize = (opts.kids as readonly string[]).includes(it.size);
      const oos =
        (isAdultSize && opts.adultsOutOfStock) ||
        (isKidSize && opts.kidsOutOfStock) ||
        opts.soldOutSizes.includes(it.size);
      if (oos) bad.push(`${product.klub} ${product.igrac} (${it.size})`.replace(/\s+/g, " ").trim());
    } catch {
      // fail-open — ne blokiraj narudžbu zbog greške u provjeri
    }
  }
  return bad;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { payload, errors } = parseOrderPayload(body);

    if (errors.length) {
      return NextResponse.json(
        {
          ok: false,
          message: errors[0]
        },
        { status: 400 }
      );
    }

    // ── SIGURNOST NOVCA: server prekalkulira dostavu i popust; NE vjeruje klijentu. ──
    // Pogodnosti (besplatna dostava ≥60€, popusti) vrijede SAMO za prijavljene kupce.
    // Ovako nitko ne može podvaliti dostava=0 ni lažni popust (bitno za Igor/Ivica podjelu).
    const { userId } = await auth();
    const signedIn = !!userId;
    const goods = payload!.subtotal;
    let discount = 0;
    let freeship = false;
    let promoCode: string | undefined;
    if (signedIn && payload!.promoCode) {
      const look = await lookupPromo(payload!.promoCode, goods);
      if (look.ok) {
        promoCode = look.promo.code;
        discount = look.discount;
        freeship = look.promo.kind === "freeship";
      }
    }
    const shipping = signedIn && (goods >= FREE_SHIPPING_THRESHOLD_EUR || freeship) ? 0 : SHIPPING_PRICE_EUR;
    payload!.shipping = shipping;
    payload!.discount = discount;
    payload!.promoCode = promoCode;
    payload!.total = Math.max(0, goods - discount) + shipping;
    payload!.userId = signedIn ? userId : null;
    payload!.igHandle = normalizeIgHandle(payload!.igHandle); // PS5 nagradna igra — auto-prijava

    // Odbij narudžbu za rasprodanu veličinu/segment PRIJE slanja obavijesti —
    // da OOS narudžba nikad ne uđe (npr. kupac imao staru stranicu otvorenu).
    const unavailable = await findUnavailableItems(payload!.items ?? []);
    if (unavailable.length) {
      return NextResponse.json(
        {
          ok: false,
          code: "OUT_OF_STOCK",
          message: `Nažalost, u međuvremenu je rasprodano: ${unavailable.join(", ")}. Ukloni iz košarice ili odaberi drugu veličinu.`
        },
        { status: 409 }
      );
    }

    const notificationResult = await sendOrderNotifications(payload!);

    if (notificationResult.configuredChannels === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOTIFICATIONS_NOT_CONFIGURED",
          message:
            "Narudžbe preko forme još nisu povezane s mailom i WhatsAppom. Za sada pošalji narudžbu direktno na WhatsApp."
        },
        { status: 503 }
      );
    }

    // Narudžba pada samo ako NIJEDAN uključeni kanal nije prošao (prije je
    // tražila baš admin email, pa bi gašenje emaila u Postavkama rušilo narudžbe).
    if (notificationResult.successfulChannels === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOTIFICATIONS_FAILED",
          message: "Narudžbu trenutno nismo uspjeli zaprimiti. Pokušaj ponovno za minutu."
        },
        { status: 502 }
      );
    }

    // Log to Google Sheet + mirror to DB (both best-effort — never block/fail the order)
    await Promise.allSettled([
      logOrderToSheet(payload!),
      saveOrderToDb(payload!),
      autoEnterGiveaway(payload!.igHandle, payload!.name, payload!.userId ?? null, payload!.email, payload!.phone)
    ]);

    return NextResponse.json({
      ok: true,
      notifications: notificationResult
    });
  } catch (error) {
    console.error("[orders] Unexpected order submission error", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Dogodila se greška prilikom slanja narudžbe. Pokušaj ponovno."
      },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      message: "Order API is ready."
    },
    { status: 200 }
  );
}
