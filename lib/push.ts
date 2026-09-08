// Web Push (PWA obavijesti) — slanje na admin uređaje koji su uključili obavijesti.
// VAPID ključevi dolaze iz env-a; ako ih nema, sve tiho ne radi (configured=false),
// pa NIŠTA ne puca (narudžbe rade i bez konfiguriranog pusha). Istekle pretplate
// (404/410) automatski se brišu pri slanju.
import webpush from "web-push";

import { prisma } from "@/lib/prisma";
import { getOrderReference, type OrderPayload } from "@/lib/orders";
import { CONTACT_EMAIL } from "@/lib/site";

const PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "").trim();
const PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "").trim();
const SUBJECT = (process.env.VAPID_SUBJECT || `mailto:${CONTACT_EMAIL}`).trim();

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  } catch (e) {
    console.error("[push] VAPID setup nije uspio (provjeri ključeve):", e);
  }
}

export function pushConfigured() {
  return configured;
}

export type PushMessage = {
  title: string;
  body: string;
  url?: string; // odredište na klik (default /admin/)
  tag?: string; // grupiranje / zamjena iste obavijesti
  kind?: string; // "order" | "daily" | "test"
};

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

// Interno: pošalji na zadane pretplate, očisti istekle. Nikad ne baca.
async function sendToSubs(subs: SubRow[], msg: PushMessage) {
  if (!configured || subs.length === 0) {
    return { configured, sent: 0, failed: 0, pruned: 0 };
  }
  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    url: msg.url || "/admin/",
    tag: msg.tag,
    kind: msg.kind || "info"
  });
  const stale: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 3600, urgency: "high" }
        );
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          stale.push(s.id); // pretplata istekla / uređaj odjavljen → očisti
        } else {
          console.error("[push] slanje nije uspjelo:", code, (e as { body?: string })?.body || (e as Error)?.message);
        }
        failed++;
      }
    })
  );

  let pruned = 0;
  if (stale.length) {
    try {
      const r = await prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
      pruned = r.count;
    } catch {
      /* čišćenje je best-effort */
    }
  }
  return { configured, sent, failed, pruned };
}

// Pošalji na SVE admin pretplate.
export async function sendPushToAll(msg: PushMessage) {
  if (!configured) return { configured: false, sent: 0, failed: 0, pruned: 0 };
  let subs: SubRow[] = [];
  try {
    subs = await prisma.pushSubscription.findMany({ select: { id: true, endpoint: true, p256dh: true, auth: true } });
  } catch (e) {
    console.error("[push] učitavanje pretplata nije uspjelo:", e);
    return { configured: true, sent: 0, failed: 0, pruned: 0 };
  }
  return sendToSubs(subs, msg);
}

// Pošalji na jednu pretplatu po endpointu (za "Pošalji test").
export async function sendPushToEndpoint(endpoint: string, msg: PushMessage) {
  if (!configured) return { configured: false, sent: 0, failed: 0, pruned: 0 };
  let sub: SubRow | null = null;
  try {
    sub = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { id: true, endpoint: true, p256dh: true, auth: true }
    });
  } catch {
    /* ignore */
  }
  if (!sub) return { configured: true, sent: 0, failed: 0, pruned: 0 };
  return sendToSubs([sub], msg);
}

// Nova narudžba → push svima. Best-effort (pozivatelj hvata grešku).
export async function sendNewOrderPush(order: OrderPayload) {
  const ref = getOrderReference(order.createdAt);
  const total = (order.total ?? 0).toFixed(2).replace(".", ",");
  const items = order.itemCount ?? order.items?.length ?? 0;
  const city = order.city ? ` · ${order.city}` : "";
  return sendPushToAll({
    title: "🛒 Nova narudžba!",
    body: `${order.name || "Kupac"}${city} — ${total} € · ${items} ${items === 1 ? "artikl" : "artikla"}`,
    url: `/admin/?order=${encodeURIComponent(ref)}`,
    tag: `order-${ref}`,
    kind: "order"
  });
}
