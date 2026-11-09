import { NextResponse } from "next/server";

import { checkGlsDeliveries } from "@/lib/gls-tracking";
import { sendAdminTelegramText } from "@/lib/notifications";
import { buildReturnedText, sendReturnedPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel Cron (raspored u vercel.json). Vercel automatski šalje
// Authorization: Bearer $CRON_SECRET ako je CRON_SECRET env postavljen.
// Bez ispravnog ključa → 401 (da endpoint ne bude javno okidan).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const r = await checkGlsDeliveries();

  // Novi povrati → JEDNA obavijest (push + Telegram). Samo podsjetnik: status narudžbe
  // se NE mijenja automatski — čovjek klikne "Vraćeno" u adminu. Best-effort: greška
  // obavijesti nikad ne ruši cron.
  let returnedNotified = false;
  if (r.returnedList.length > 0) {
    try {
      await sendReturnedPush(r.returnedList);
      returnedNotified = true;
    } catch (e) {
      console.error("[cron/gls] push o povratu nije uspio:", e);
    }
    try {
      await sendAdminTelegramText(`↩ Povrat: ${buildReturnedText(r.returnedList)}`);
    } catch (e) {
      console.error("[cron/gls] Telegram o povratu nije uspio:", e);
    }
  }

  return NextResponse.json({ ok: true, ...r, returnedNotified });
}
