import { NextResponse } from "next/server";

import { ADMIN_COOKIE, ADMIN_USER_COOKIE, adminToken, userCookieValue, verifyPin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // 1) Prijava na admin-profil (Igor/Ivica/Nina/Ana).
  if (username) {
    const user = await prisma.adminUser
      .findUnique({ where: { username } })
      .catch(() => null);
    if (user && user.active && verifyPin(password, user.pinHash)) {
      await prisma.adminUser
        .update({ where: { id: user.id }, data: { lastLogin: new Date() } })
        .catch(() => {});
      const res = NextResponse.json({ ok: true, username: user.username, role: user.role });
      res.cookies.set(ADMIN_USER_COOKIE, userCookieValue(user.id), COOKIE_OPTS);
      return res;
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 2) Bootstrap / fallback: zajednička ADMIN_PASSWORD → OWNER (dok se ne posloži tim).
  if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.json({ ok: true, role: "OWNER" });
    res.cookies.set(ADMIN_COOKIE, adminToken(), COOKIE_OPTS);
    return res;
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
