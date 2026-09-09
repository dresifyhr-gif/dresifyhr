import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isAdmin, requireAction, getAdminUser } from "@/lib/admin-auth";
import { getIgConnectionMeta, saveIgToken, exchangeToLongLived, discoverIgAccount, envIgBusinessId } from "@/lib/ig-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Status IG veze (čitanje) — NE vraća token. Za "Poveži Instagram" karticu.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const meta = await getIgConnectionMeta();
  return NextResponse.json({
    ok: true,
    connected: Boolean(meta?.connected),
    username: meta?.username ?? null,
    igBusinessId: meta?.igBusinessId ?? envIgBusinessId() ?? null,
    expiresAt: meta?.expiresAt ?? null,
    lastRefreshedAt: meta?.lastRefreshedAt ?? null,
    connectedBy: meta?.connectedBy ?? null
  });
}

// "Poveži Instagram": Gazda zalijepi token → razmijenimo u long-lived (60 dana) →
// spremimo šifrirano. Samo OWNER (osjetljivo). Token stiže SAMO ovdje, nikad u env.
export async function POST(request: Request) {
  const admin = await requireAction("settings");
  if (!admin) return NextResponse.json({ ok: false, message: "Samo vlasnik može spajati Instagram." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const raw = String(body?.token || "").trim();
  if (raw.length < 20) return NextResponse.json({ ok: false, message: "Token izgleda prekratko — kopiraj cijeli iz Graph API Explorera." }, { status: 400 });

  try {
    // 1) Razmijeni u long-lived (produženje na ~60 dana).
    const { token, expiresAt } = await exchangeToLongLived(raw);
    // 2) Otkrij/povrdi IG business account (username za prikaz).
    const acc = await discoverIgAccount(token);
    // 3) Spremi.
    await saveIgToken({
      token,
      igBusinessId: acc.igBusinessId || envIgBusinessId() || null,
      fbPageId: acc.fbPageId,
      username: acc.username,
      expiresAt,
      connectedBy: admin.username
    });
    revalidateTag("ig-stats");
    return NextResponse.json({ ok: true, username: acc.username, igBusinessId: acc.igBusinessId, expiresAt });
  } catch (e) {
    let msg = e instanceof Error ? e.message : "Spajanje nije uspjelo.";
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) msg = parsed.error.message;
    } catch {
      /* nije JSON */
    }
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
