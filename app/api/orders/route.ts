import { NextResponse } from "next/server";

import { parseOrderPayload } from "@/lib/orders";
import { sendOrderNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

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

    if (!notificationResult.email.sent) {
      return NextResponse.json(
        {
          ok: false,
          code: "ADMIN_EMAIL_FAILED",
          message: "Narudžbu trenutno nismo uspjeli poslati na admin email. Pokušaj ponovno za minutu."
        },
        { status: 502 }
      );
    }

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
