import { NextResponse } from "next/server";

import { ADMIN_COOKIE, ADMIN_USER_COOKIE } from "@/lib/admin-auth";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

export async function GET() {
  const res = NextResponse.redirect(`${SITE_URL}/admin/login/`);
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(ADMIN_USER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
