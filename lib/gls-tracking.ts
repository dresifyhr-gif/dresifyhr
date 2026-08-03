import "server-only";

import { prisma } from "@/lib/prisma";

// Čita status dostave s tracking stranica kurira (nema službeni API) i mapira u:
//  "delivered" = uručeno / dostavljeno primatelju
//  "returned"  = pošiljka se vraća / vraćena pošiljatelju (kupac odbio, netko nije preuzeo)
//  "transit"   = u mreži / na dostavi
//  "prep"      = tek zaprimljeno / u obradi
const GLS_TT = "https://online.gls-croatia.com/tt_page.php?tt_value=";
const HP_TT = "https://posiljka.posta.hr/hr/tracking/trackingdata?barcode=";

export type DeliveryStatus = "delivered" | "returned" | "transit" | "prep" | null;

// Prepoznaje POVRAT — "Dostavljeno" je dvosmisleno (paket može biti uručen NAMA natrag),
// pa povrat provjeravamo PRVO. Hvata: vraćeno/vraća pošiljatelju, povrat, neuručeno, odbijeno.
// Temeljeno na STVARNIM GLS statusima vraćene pošiljke: "23-Vratiti pošiljatelju",
// "22-Vratiti u HUB". Namjerno NE hvatamo samo "Odbijanje"/"Nema primatelja" jer
// paket može biti kasnije uspješno dostavljen u ponovnom pokušaju (lažni povrat).
const RETURN_RE = /vratiti\s+(po[sš]iljatelj|u\s+hub)|\b2[23]\s*-\s*vrat|vra[cć]en\w*\s+po[sš]iljatelj|povrat\s+po[sš]iljatelj|return\s+to\s+sender/i;

// GLS: statusi tipa "05-Dostavljeno", "04-Sken dostavne liste", "03-Depo ulaz"…
async function glsStatus(tracking: string): Promise<DeliveryStatus> {
  try {
    const res = await fetch(GLS_TT + encodeURIComponent(tracking), { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const t = (await res.text()).replace(/<[^>]*>/g, " ");
    if (RETURN_RE.test(t)) return "returned";
    if (/05-\s*Dostavljeno/i.test(t)) return "delivered";
    if (/0[34]-\s*(Depo|Sken)/i.test(t)) return "transit";
    return "prep";
  } catch {
    return null;
  }
}

// HP (Hrvatska pošta): "Uručeno" (č kao &#x10D; entitet), "Otprema", "zaprimljeno"…
async function hpStatus(tracking: string): Promise<DeliveryStatus> {
  try {
    const res = await fetch(HP_TT + encodeURIComponent(tracking), {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const t = (await res.text()).replace(/<[^>]*>/g, " ");
    if (RETURN_RE.test(t)) return "returned";
    // "Uru\S{0,10}eno" hvata i "Uručeno" i HTML-kodirano "Uru&#x10D;eno".
    if (/Uru\S{0,10}eno|Isporu\S{0,10}eno|Dostavljeno/i.test(t)) return "delivered";
    if (/Otprem|prispje|u dostavi|dostavlja|izlazn|u prijenosu/i.test(t)) return "transit";
    return "prep";
  } catch {
    return null;
  }
}

// Prođe kroz sve poslane narudžbe s trackingom (GLS + HP), dohvati status i spremi
// deliveryStatus (deliveredAt kad je dostavljeno). Male grupe da ne gnjavimo kurire.
export async function checkGlsDeliveries(opts: { dryRun?: boolean } = {}) {
  // Samo NE-prikupljene — prikupljeno pouzeće znači da je paket dostavljen i posao završen,
  // ne zanima nas više u praćenju dostave (i puno manje upita kuririma).
  const orders = await prisma.order.findMany({
    where: { status: { in: ["shipped", "done"] }, cashCollected: false },
    select: { id: true, customerName: true, tracking: true, courier: true, deliveryStatus: true }
  });
  const cand = orders.filter((o) => (o.tracking || "").trim());
  const counts = { delivered: 0, returned: 0, transit: 0, prep: 0, unknown: 0 };
  const newlyDelivered: { name: string; tracking: string }[] = [];
  const newlyReturned: { name: string; tracking: string }[] = [];
  const BATCH = 5;
  for (let i = 0; i < cand.length; i += BATCH) {
    const chunk = cand.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async (o) => {
        const tr = (o.tracking || "").trim();
        const st = o.courier === "hp" ? await hpStatus(tr) : await glsStatus(tr);
        return { o, st };
      })
    );
    for (const { o, st } of results) {
      if (!st) { counts.unknown++; continue; }
      counts[st]++;
      if (st === "delivered" && o.deliveryStatus !== "delivered") newlyDelivered.push({ name: o.customerName, tracking: (o.tracking || "").trim() });
      if (st === "returned" && o.deliveryStatus !== "returned") newlyReturned.push({ name: o.customerName, tracking: (o.tracking || "").trim() });
      if (!opts.dryRun && o.deliveryStatus !== st) {
        // Samo OZNAKA dostave — status narudžbe NE diramo (Gazda sam klikne "Vraćeno").
        // Povrat čisti eventualni lažni deliveredAt da ne ostane u naplati.
        await prisma.order.update({
          where: { id: o.id },
          data: {
            deliveryStatus: st,
            ...(st === "delivered" ? { deliveredAt: new Date() } : {}),
            ...(st === "returned" ? { deliveredAt: null } : {})
          }
        });
      }
    }
  }
  return { checked: cand.length, ...counts, newlyDelivered: newlyDelivered.length, newlyReturned: newlyReturned.length, list: newlyDelivered, returnedList: newlyReturned };
}
