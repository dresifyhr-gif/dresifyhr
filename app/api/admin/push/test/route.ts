import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { pushConfigured, sendPushToEndpoint, sendPushToAll } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Testna obavijest — na ovaj uređaj (ako je poslan endpoint), inače na sve.
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  if (!pushConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const endpoint: string | undefined = body?.endpoint;

  const msg = {
    title: "✅ Obavijesti rade!",
    body: "Ovako će izgledati kad stigne nova narudžba.",
    url: "/admin/",
    tag: "test",
    kind: "test"
  };

  const res = endpoint ? await sendPushToEndpoint(endpoint, msg) : await sendPushToAll(msg);
  return NextResponse.json({ ok: res.sent > 0, ...res });
}
