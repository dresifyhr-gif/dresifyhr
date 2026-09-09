import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

import { prisma } from "@/lib/prisma";

// ————————————————————————————————————————————————————————————————
// Instagram (Meta Graph API) token — pohrana + auto-osvježavanje.
//
// Token NIJE u env-u: Gazda ga zalijepi kroz admin ("Poveži Instagram"),
// server ga razmijeni u long-lived (60 dana) i sprema u IgConnection (singleton).
// Ovdje su: čitanje (getIgToken), spremanje (saveIgToken), razmjena/produženje
// (exchangeToLongLived) i lijeno osvježavanje (ensureFreshIgToken).
//
// accessToken se u bazi drži ŠIFRIRAN (AES-256-GCM, format "gcm$iv$tag$cipher").
// Nikad se ne vraća klijentu. META_APP_ID/SECRET/IG_BUSINESS_ID su u env-u.
// ————————————————————————————————————————————————————————————————

const GRAPH = "https://graph.facebook.com/v21.0";

export const IG_PROVIDER_ID = "singleton";

function appId() {
  return process.env.META_APP_ID?.trim() || "";
}
function appSecret() {
  return process.env.META_APP_SECRET?.trim() || "";
}
export function envIgBusinessId() {
  return process.env.IG_BUSINESS_ID?.trim() || "";
}
function envFbPageId() {
  return process.env.FB_PAGE_ID?.trim() || "";
}

// Ključ za enkripciju: poseban IG_TOKEN_SECRET, pa fallback na admin tajne
// (isti obrazac kao signingSecret() u admin-auth.ts). Bitno: mora biti stabilan.
function encKey(): Buffer {
  const secret =
    process.env.IG_TOKEN_SECRET || process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_PASSWORD || "dresify-ig-token-secret";
  return scryptSync(secret, "dresify-ig-token", 32);
}

function encryptToken(plain: string): string {
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `gcm$${iv.toString("hex")}$${tag.toString("hex")}$${enc.toString("hex")}`;
  } catch {
    // Ako enkripcija padne, radije spremi plain nego da izgubimo token.
    return plain;
  }
}

function decryptToken(stored: string): string | null {
  if (!stored) return null;
  if (!stored.startsWith("gcm$")) return stored; // plain fallback (kompatibilnost)
  try {
    const [, ivHex, tagHex, dataHex] = stored.split("$");
    const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null; // krivi ključ / oštećeno → tretiraj kao nespojeno
  }
}

export type IgTokenRow = {
  token: string;
  igBusinessId: string;
  fbPageId: string | null;
  username: string | null;
  expiresAt: Date | null;
};

// Sirovi red iz baze (bez dešifriranog tokena) — za status prikaz.
export async function getIgConnectionMeta() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const row = await prisma.igConnection.findUnique({ where: { id: IG_PROVIDER_ID } });
    if (!row) return null;
    return {
      connected: Boolean(row.accessToken),
      igBusinessId: row.igBusinessId || envIgBusinessId() || null,
      username: row.username,
      expiresAt: row.expiresAt,
      lastRefreshedAt: row.lastRefreshedAt,
      connectedBy: row.connectedBy,
      updatedAt: row.updatedAt
    };
  } catch {
    return null;
  }
}

// Dešifrirani token + id-evi. null = nije spojeno (pozivatelj radi no-op).
export async function getIgToken(): Promise<IgTokenRow | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const row = await prisma.igConnection.findUnique({ where: { id: IG_PROVIDER_ID } });
    if (!row?.accessToken) return null;
    const token = decryptToken(row.accessToken);
    if (!token) return null;
    return {
      token,
      igBusinessId: row.igBusinessId || envIgBusinessId(),
      fbPageId: row.fbPageId || envFbPageId() || null,
      username: row.username,
      expiresAt: row.expiresAt
    };
  } catch {
    return null;
  }
}

export async function saveIgToken(input: {
  token: string;
  igBusinessId?: string | null;
  fbPageId?: string | null;
  username?: string | null;
  scopes?: string | null;
  expiresAt?: Date | null;
  connectedBy?: string | null;
}) {
  const enc = encryptToken(input.token);
  const data = {
    accessToken: enc,
    igBusinessId: input.igBusinessId ?? envIgBusinessId() ?? null,
    fbPageId: input.fbPageId ?? envFbPageId() ?? null,
    username: input.username ?? null,
    scopes: input.scopes ?? null,
    expiresAt: input.expiresAt ?? null,
    lastRefreshedAt: new Date(),
    connectedBy: input.connectedBy ?? null
  };
  await prisma.igConnection.upsert({
    where: { id: IG_PROVIDER_ID },
    create: { id: IG_PROVIDER_ID, ...data },
    update: data
  });
}

// Razmijeni kratki/dugi user token za (novi) long-lived token (60 dana).
// Isti poziv s postojećim long-lived tokenom ga PRODUŽUJE.
export async function exchangeToLongLived(token: string): Promise<{ token: string; expiresAt: Date }> {
  if (!appId() || !appSecret()) {
    // Bez app kredencijala ne možemo razmijeniti — vrati token kakav jest.
    return { token, expiresAt: new Date(Date.now() + 60 * 86_400_000) };
  }
  const u = new URL(`${GRAPH}/oauth/access_token`);
  u.searchParams.set("grant_type", "fb_exchange_token");
  u.searchParams.set("client_id", appId());
  u.searchParams.set("client_secret", appSecret());
  u.searchParams.set("fb_exchange_token", token);
  const r = await fetch(u, { signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(await r.text());
  const j = await r.json();
  const secs = Number(j?.expires_in) > 0 ? Number(j.expires_in) : 5_184_000;
  return { token: String(j.access_token), expiresAt: new Date(Date.now() + secs * 1000) };
}

// Dohvati IG business account id (i username) povezan s FB stranicom — koristi se
// pri spajanju da se popuni/potvrdi igBusinessId čak i ako env fali.
export async function discoverIgAccount(token: string): Promise<{ igBusinessId: string | null; fbPageId: string | null; username: string | null }> {
  try {
    const u = new URL(`${GRAPH}/me/accounts`);
    u.searchParams.set("fields", "name,instagram_business_account{id,username}");
    u.searchParams.set("access_token", token);
    const r = await fetch(u, { signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return { igBusinessId: envIgBusinessId() || null, fbPageId: envFbPageId() || null, username: null };
    const j = await r.json();
    const pages: any[] = Array.isArray(j?.data) ? j.data : [];
    const want = envFbPageId();
    const page = (want && pages.find((p) => String(p?.id) === want)) || pages.find((p) => p?.instagram_business_account) || pages[0];
    const iba = page?.instagram_business_account;
    return {
      igBusinessId: iba?.id ? String(iba.id) : envIgBusinessId() || null,
      fbPageId: page?.id ? String(page.id) : envFbPageId() || null,
      username: iba?.username ? String(iba.username) : null
    };
  } catch {
    return { igBusinessId: envIgBusinessId() || null, fbPageId: envFbPageId() || null, username: null };
  }
}

// Vrati valjan token; ako je pred istekom (≤7 dana) i imamo app kredencijale,
// produži ga i spremi. Nikad ne baca — na grešku vrati postojeći/najbolji.
export async function ensureFreshIgToken(): Promise<IgTokenRow | null> {
  const row = await getIgToken();
  if (!row) return null;
  const soon = row.expiresAt && row.expiresAt.getTime() - Date.now() < 7 * 86_400_000;
  if (soon && appId() && appSecret()) {
    try {
      const fresh = await exchangeToLongLived(row.token);
      await saveIgToken({
        token: fresh.token,
        igBusinessId: row.igBusinessId,
        fbPageId: row.fbPageId,
        username: row.username,
        expiresAt: fresh.expiresAt
      });
      return { ...row, token: fresh.token, expiresAt: fresh.expiresAt };
    } catch {
      return row; // produženje nije uspjelo → koristi postojeći dok vrijedi
    }
  }
  return row;
}
