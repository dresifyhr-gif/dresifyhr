import "server-only";

import { cookies } from "next/headers";
import { createHash } from "crypto";

export const ADMIN_COOKIE = "dresify_admin";

// Cookie token derived from the password so it can't be trivially forged.
export function adminToken() {
  const pw = process.env.ADMIN_PASSWORD || "";
  return createHash("sha256").update("dresify-admin::" + pw).digest("hex");
}

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === adminToken();
}
