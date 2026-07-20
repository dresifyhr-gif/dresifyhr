import "server-only";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/site";
import { phoneKey } from "@/lib/utils";

// ── Kolo sreće ───────────────────────────────────────────────────────────────
// Jedna vrtnja po broju mobitela, plus još jedna za svaku narudžbu od 60 €
// naviše, plus još jedna za svako izvučeno polje "ponovno okretanje".
//
// Ishod bira SERVER. Klijent samo animira kolo do polja koje mu server kaže —
// da preglednik ne može namjestiti dobitak.

export type PrizeId = "none" | "respin" | "p5" | "p10" | "freeship" | "p20" | "dres";

export type Prize = {
  id: PrizeId;
  weight: number; // omjer, ne postotak — zbroj ne mora biti 100
  label: string; // što kupac vidi na polju
  kind?: "percent" | "freeship" | "amount"; // prazno = nema koda
  value?: number;
  minSubtotal?: number;
};

// Redoslijed je i redoslijed polja na kolu (u smjeru kazaljke).
// Dobitna šansa ≈ 27 %; "ponovno okretanje" i "bez dobitka" drže trošak niskim.
export const PRIZES: Prize[] = [
  { id: "none", weight: 65, label: "Nema dobitka" },
  { id: "p5", weight: 10, label: "5% popusta", kind: "percent", value: 5, minSubtotal: 20 },
  { id: "respin", weight: 8, label: "Ponovno okretanje" },
  { id: "p10", weight: 8, label: "10% popusta", kind: "percent", value: 10, minSubtotal: 20 },
  { id: "freeship", weight: 5, label: "Besplatna dostava", kind: "freeship", value: 0, minSubtotal: 20 },
  { id: "p20", weight: 3, label: "20% popusta", kind: "percent", value: 20, minSubtotal: 40 },
  { id: "dres", weight: 1, label: "GRATIS DRES", kind: "amount", value: 20, minSubtotal: 20 }
];

// Kod vrijedi 48 h — tjera na brzu kupnju i ograničava izloženost.
const CODE_HOURS = 48;

export type SpinState = {
  active: boolean;
  earned: number; // koliko vrtnji ukupno zaslužuje
  used: number; // koliko ih je potrošio
  left: number;
};

function randomCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bez I/O/0/1 (zabuna pri prepisivanju)
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `KOLO-${s}`;
}

// Koliko je narudžbi od 60 € naviše taj broj napravio (roba, bez dostave).
async function bigOrderCount(key: string): Promise<number> {
  const rows = await prisma.order.findMany({
    where: { status: { notIn: ["cancelled", "returned"] } },
    select: { phone: true, total: true, shipping: true }
  });
  return rows.filter((o) => {
    if (phoneKey(o.phone) !== key) return false;
    const goods = Math.max(0, (o.total ?? 0) - (o.shipping ?? 0));
    return goods >= FREE_SHIPPING_THRESHOLD_EUR;
  }).length;
}

export async function getSpinState(phone: string | null | undefined): Promise<SpinState> {
  const s = await getSettings();
  const base: SpinState = { active: s.koloActive, earned: 0, used: 0, left: 0 };
  if (!s.koloActive) return base;

  const key = phoneKey(phone);
  if (!key) return base;

  const [spins, big] = await Promise.all([
    prisma.wheelSpin.findMany({ where: { phoneKey: key }, select: { prize: true } }),
    bigOrderCount(key)
  ]);

  const respins = spins.filter((x) => x.prize === "respin").length;
  const earned = 1 + big + respins;
  const used = spins.length;
  return { active: true, earned, used, left: Math.max(0, earned - used) };
}

function pickPrize(): Prize {
  const total = PRIZES.reduce((a, p) => a + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PRIZES) {
    r -= p.weight;
    if (r < 0) return p;
  }
  return PRIZES[0];
}

export type SpinResult =
  | { ok: true; prize: PrizeId; label: string; code: string | null; left: number }
  | { ok: false; reason: "off" | "no_phone" | "no_spins" };

export async function spin(phone: string | null | undefined): Promise<SpinResult> {
  const key = phoneKey(phone);
  if (!key) return { ok: false, reason: "no_phone" };

  const state = await getSpinState(phone);
  if (!state.active) return { ok: false, reason: "off" };
  if (state.left <= 0) return { ok: false, reason: "no_spins" };

  const prize = pickPrize();
  let code: string | null = null;

  if (prize.kind) {
    // Jedinstvena šifra (sudar je gotovo nemoguć, ali provjeravamo).
    let c = randomCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.promoCode.findUnique({ where: { code: c } });
      if (!exists) break;
      c = randomCode();
    }
    await prisma.promoCode.create({
      data: {
        code: c,
        kind: prize.kind,
        value: prize.value ?? 0,
        minSubtotal: prize.minSubtotal ?? 0,
        label: `${prize.label} — Kolo sreće 🎡`,
        active: true,
        maxUses: 1, // osobna nagrada
        expiresAt: new Date(Date.now() + CODE_HOURS * 3600 * 1000),
        source: "kolo",
        personalFor: key,
        note: "Kolo sreće"
      }
    });
    code = c;
  }

  await prisma.wheelSpin.create({ data: { phoneKey: key, prize: prize.id, code } });

  const after = await getSpinState(phone);
  return { ok: true, prize: prize.id, label: prize.label, code, left: after.left };
}
