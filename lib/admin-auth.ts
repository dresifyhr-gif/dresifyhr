import "server-only";

import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

import { prisma } from "@/lib/prisma";

// Stari cookie: jedna zajednička ADMIN_PASSWORD (bootstrap / fallback za OWNER).
export const ADMIN_COOKIE = "dresify_admin";
// Novi cookie: potpisani identitet admin-profila (Igor/Ivica/Nina/Ana).
export const ADMIN_USER_COOKIE = "dresify_admin_user";

// ————————————————————————————————————————————————————————————————
// Uloge i ovlasti
// OWNER  = sve (Igor)
// PARTNER= narudžbe + proizvodi + reklama(adspend) + poravnanje(settlement)  (Ivica)
// STAFF  = narudžbe + proizvodi  (Nina, Ana)
// Svi VIDE sve; razlikuju se samo u pisanju.
// ————————————————————————————————————————————————————————————————
export type AdminRole = "OWNER" | "PARTNER" | "STAFF";

export type AdminSession = {
  id: string;
  username: string;
  role: AdminRole;
  avatar: string | null;
};

// Radnje koje se štite na serveru. "orders"/"products" smiju svi ulogirani.
export type AdminAction =
  | "orders" // slanje, otkaz, ručni unos, izmjene narudžbe
  | "products" // proizvodi, količine, zaliha
  | "adspend" // upis plaćene reklame
  | "settlement" // poravnanje novca
  | "settings" // postavke, tim, sve ostalo
  | "owner"; // izričito samo Igor

export function can(role: AdminRole | null | undefined, action: AdminAction): boolean {
  if (!role) return false;
  if (role === "OWNER") return true; // OWNER smije sve
  switch (action) {
    case "orders":
    case "products":
      return role === "PARTNER" || role === "STAFF";
    case "adspend":
    case "settlement":
      return role === "PARTNER";
    case "settings":
    case "owner":
    default:
      return false;
  }
}

// ————————————————————————————————————————————————————————————————
// Hashiranje lozinki (scrypt, salt po korisniku — self-contained, ne ovisi o env-u)
// Format pinHash: "scrypt$<saltHex>$<hashHex>"
// ————————————————————————————————————————————————————————————————
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const actual = scryptSync(pin, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ————————————————————————————————————————————————————————————————
// Cookie potpisivanje (HMAC) — vrijednost cookieja je "<userId>.<hmac>"
// ————————————————————————————————————————————————————————————————
function signingSecret() {
  return process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_PASSWORD || "dresify-admin-secret";
}

export function userCookieValue(userId: string): string {
  const sig = createHmac("sha256", signingSecret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

function verifyUserCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", signingSecret()).update(userId).digest("hex");
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? userId : null;
}

// ————————————————————————————————————————————————————————————————
// Stari token (zajednička lozinka) — ostaje za bootstrap OWNER-a.
// ————————————————————————————————————————————————————————————————
export function adminToken() {
  const pw = process.env.ADMIN_PASSWORD || "";
  return createHash("sha256").update("dresify-admin::" + pw).digest("hex");
}

function hasLegacySession(jar: Awaited<ReturnType<typeof cookies>>): boolean {
  if (!process.env.ADMIN_PASSWORD) return false;
  return jar.get(ADMIN_COOKIE)?.value === adminToken();
}

// isAdmin: bilo koji ulogiran (novi profil ILI stara lozinka). NE dira bazu —
// potpis cookieja je dovoljan dokaz, pa 47 postojećih ruta ne dobiva DB trošak.
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  if (verifyUserCookie(jar.get(ADMIN_USER_COOKIE)?.value)) return true;
  return hasLegacySession(jar);
}

// getAdminUser: TKO je prijavljen + uloga. Čita bazu za profil.
// Stara lozinka (bootstrap) → sintetički OWNER "Igor" da može posložiti tim.
export async function getAdminUser(): Promise<AdminSession | null> {
  const jar = await cookies();
  const userId = verifyUserCookie(jar.get(ADMIN_USER_COOKIE)?.value);
  if (userId) {
    const u = await prisma.adminUser
      .findUnique({ where: { id: userId } })
      .catch(() => null);
    if (u && u.active) {
      return { id: u.id, username: u.username, role: (u.role as AdminRole) || "STAFF", avatar: u.avatar };
    }
    return null;
  }
  if (hasLegacySession(jar)) {
    return { id: "legacy", username: "Igor", role: "OWNER", avatar: "👑" };
  }
  return null;
}

// Pomoćnik za rute: vrati sesiju samo ako smije radnju, inače null.
export async function requireAction(action: AdminAction): Promise<AdminSession | null> {
  const user = await getAdminUser();
  if (!user) return null;
  return can(user.role, action) ? user : null;
}
