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

// KONAČNI povrat — roba definitivno ide natrag pošiljatelju (nama). Kad se ovo pojavi,
// pošiljka je vraćena čak i ako poslije piše "05-Dostavljeno" (to je dostavljeno NAMA,
// ne kupcu). Statusi: "23-Vratiti pošiljatelju", "return to sender", "vraćeno pošiljatelju".
const STRONG_RETURN_RE = /vratiti\s+po[sš]iljatelj|\b23\s*-\s*vrat|vra[cć]en\w*\s+po[sš]iljatelj|povrat\s+po[sš]iljatelj|return\s+to\s+sender/i;

// MEĐUKORAK "22-Vratiti u HUB" — NIJE nužno povrat; paket može biti kasnije uspješno
// dostavljen kupcu u ponovnom pokušaju (npr. Toni: 22-Vratiti u HUB → pa 05-Dostavljeno).
// Zato ga vrednujemo POZICIJSKI (vidi glsStatus), ne kao konačni povrat.
const HUB_RETURN_RE = /\b22\s*-\s*vrat|vratiti\s+u\s+hub/i;

// Zadržano za HP (Hrvatska pošta) — širi uzorak povrata.
const RETURN_RE = STRONG_RETURN_RE;

// Vrati poziciju (indeks) prvog poklapanja regexa u tekstu, ili Infinity ako ga nema.
function firstIdx(text: string, re: RegExp): number {
  const m = re.exec(text);
  return m ? m.index : Infinity;
}

// GLS lista ide NAJNOVIJI STATUS NA VRHU (npr. "05-Dostavljeno" gore, "01-APL" dolje).
// Zato NE smijemo tražiti "vratiti" bilo gdje — paket koji je bio "22-Vratiti u HUB"
// može kasnije biti ipak dostavljen. Pobjeđuje status koji je NAJBLIŽE VRHU (najmanji
// indeks = najnoviji događaj). Delivered tipa "05-Dostavljeno", transit "03/04-Depo/Sken".
// Igor 23.11.: točno stanje na kartici narudžbe — redovi GLS tablice (najnoviji prvi).
export type TrackEvent = { date: string; status: string; depot: string; info: string };
const decode = (s: string) =>
  s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
function parseGlsEvents(raw: string): TrackEvent[] {
  const out: TrackEvent[] = [];
  const rowRe = /<tr class="?colored_\d"?>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(raw))) {
    const cells = Array.from(m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((c) => decode(c[1]));
    if (cells.length >= 2 && /^\d{4}-\d{2}-\d{2}/.test(cells[0])) {
      out.push({ date: cells[0], status: cells[1] || "", depot: cells[2] || "", info: cells[3] || "" });
    }
  }
  return out;
}
// "2026-11-23 09:24:45" → "23.11. 09:24"
const shortDate = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/.exec(d);
  return m ? `${Number(m[3])}.${Number(m[2])}. ${m[4]}:${m[5]}` : d;
};
// Zadnji događaj za prikaz na kartici: "04-Sken dostavne liste · Donji Stupnik · 23.11. 09:24".
export function eventLabel(e: TrackEvent) {
  const depot = e.depot.replace(/^\d+\s+/, "").trim();
  return [e.status, depot && depot !== "Croatia" ? depot : "", shortDate(e.date)].filter(Boolean).join(" · ");
}

// Oznaka za karticu iz cijele povijesti: ako je pošiljka vraćena pošiljatelju, zadnje
// "05-Dostavljeno" znači dostavljeno NAMA natrag — to ne smije izgledati kao uspjeh.
export function latestLabel(events: TrackEvent[]): string | null {
  const top = events[0];
  if (!top) return null;
  const returned = events.some((e) => STRONG_RETURN_RE.test(e.status));
  if (returned) return /^05-/.test(top.status) ? `↩ Vraćeno nama (povrat) · ${shortDate(top.date)}` : `↩ ${eventLabel(top)}`;
  return eventLabel(top);
}

// Cijela povijest pošiljke uživo (gumb na kartici). Samo GLS; HP ima svoj link.
export async function fetchTrackingEvents(tracking: string): Promise<TrackEvent[] | null> {
  try {
    const res = await fetch(GLS_TT + encodeURIComponent(tracking), { signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (!res.ok) return null;
    const raw = await res.text();
    if (!/class="?colored_\d/.test(raw)) return null;
    return parseGlsEvents(raw);
  } catch {
    return null;
  }
}

// sink.latest ← zadnji događaj (za karticu), bez globalnog stanja (cron i gumb mogu ići istovremeno).
async function glsStatus(tracking: string, sink?: { latest?: string }): Promise<DeliveryStatus> {
  try {
    const res = await fetch(GLS_TT + encodeURIComponent(tracking), { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const raw = await res.text();
    // Igor 23.11.: dostave su se "same vraćale na nulu" — kad GLS vrati stranicu BEZ
    // tablice statusa (preopterećen / blokira / greška), sve je ispadalo "prep" i
    // prepisivalo "dostavljeno". Bez ijednog retka statusa (npr. "05-Dostavljeno",
    // "51-Zaprimljeni…") odgovor smatramo NEPOZNATIM i ništa ne diramo.
    if (!/class="?colored_\d/.test(raw)) return null;
    if (sink) sink.latest = latestLabel(parseGlsEvents(raw)) ?? undefined;
    const t = raw.replace(/<[^>]*>/g, " ");
    // Konačni povrat pošiljatelju je definitivan — čak i ako je poslije "Dostavljeno"
    // (to je dostavljeno NAMA natrag, ne kupcu).
    if (STRONG_RETURN_RE.test(t)) return "returned";
    // Inače pobjeđuje status najbliže vrhu (najnoviji): dostavljeno / vraćanje u HUB / u prijenosu.
    const iDelivered = firstIdx(t, /05-\s*Dostavljeno/i);
    const iHubReturn = firstIdx(t, HUB_RETURN_RE);
    const iTransit = firstIdx(t, /0[34]-\s*(Depo|Sken)/i);
    const min = Math.min(iDelivered, iHubReturn, iTransit);
    if (min === Infinity) return "prep";
    if (min === iDelivered) return "delivered";
    if (min === iHubReturn) return "returned";
    return "transit";
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
    select: { id: true, customerName: true, total: true, tracking: true, courier: true, deliveryStatus: true, deliveryInfo: true }
  });
  const cand = orders.filter((o) => (o.tracking || "").trim());
  const counts = { delivered: 0, returned: 0, transit: 0, prep: 0, unknown: 0 };
  const newlyDelivered: { name: string; tracking: string }[] = [];
  const newlyReturned: { name: string; tracking: string; total: number }[] = [];
  const BATCH = 5;
  for (let i = 0; i < cand.length; i += BATCH) {
    const chunk = cand.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async (o) => {
        const tr = (o.tracking || "").trim();
        const sink: { latest?: string } = {};
        const st = o.courier === "hp" ? await hpStatus(tr) : await glsStatus(tr, sink);
        return { o, st, latest: sink.latest ?? null };
      })
    );
    for (const { o, st, latest } of results) {
      if (!st) { counts.unknown++; continue; }
      counts[st]++;
      if (st === "delivered" && o.deliveryStatus !== "delivered") newlyDelivered.push({ name: o.customerName, tracking: (o.tracking || "").trim() });
      if (st === "returned" && o.deliveryStatus !== "returned") newlyReturned.push({ name: o.customerName, tracking: (o.tracking || "").trim(), total: o.total || 0 });
      // Nikad unatrag (to je bio uzrok "opet na nuli"): "dostavljeno" se ne vraća na
      // "na dostavi"/"u pripremi", i ništa se ne vraća na "u pripremi". Dopušteno:
      // dostavljeno → vraćeno (konačni povrat) i vraćeno → na dostavi (22-HUB pa novi pokušaj).
      const backwards =
        (o.deliveryStatus === "delivered" && (st === "transit" || st === "prep")) ||
        (st === "prep" && !!o.deliveryStatus && o.deliveryStatus !== "prep");
      // Točno stanje (zadnji GLS događaj) za karticu — osvježi i kad se oznaka ne mijenja.
      if (!opts.dryRun && !backwards && latest && latest !== o.deliveryInfo && o.deliveryStatus === st) {
        await prisma.order.update({ where: { id: o.id }, data: { deliveryInfo: latest } });
      }
      if (!opts.dryRun && o.deliveryStatus !== st && !backwards) {
        // Samo OZNAKA dostave — status narudžbe NE diramo (Gazda sam klikne "Vraćeno").
        // Povrat čisti eventualni lažni deliveredAt da ne ostane u naplati.
        await prisma.order.update({
          where: { id: o.id },
          data: {
            deliveryStatus: st,
            ...(latest ? { deliveryInfo: latest } : {}),
            ...(st === "delivered" ? { deliveredAt: new Date() } : {}),
            ...(st === "returned" ? { deliveredAt: null } : {})
          }
        });
      }
    }
  }
  return { checked: cand.length, ...counts, newlyDelivered: newlyDelivered.length, newlyReturned: newlyReturned.length, list: newlyDelivered, returnedList: newlyReturned };
}
