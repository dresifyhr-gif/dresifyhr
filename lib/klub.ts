import "server-only";

import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { phoneKey } from "@/lib/utils";

// ── Dresify Klub ─────────────────────────────────────────────────────────────
// Vjernost po TELEFONU (bez računa i lozinki). Broje se samo PREUZETE (plaćene)
// narudžbe — inače bi netko lažnim COD narudžbama farmao nagradu.
// Kad kupac dosegne prag, dobije osobni jednokratni kod iz istog sustava
// popust-kodova (vidi lib/promo-db.ts).

export type KlubProgress = {
  active: boolean;
  collected: number; // preuzetih narudžbi ukupno
  target: number; // koliko ih treba za nagradu
  inCycle: number; // koliko ih ima u tekućem krugu (0..target-1 ili target)
  remaining: number; // koliko još fali do sljedeće nagrade
  earned: number; // koliko je nagrada ukupno zaslužio
  issued: number; // koliko je kodova stvarno izdano
  pending: number; // zasluženo, a još neizdano (npr. retroaktivno)
  hasReward: boolean; // ima nagradu spremnu ili neiskorišten kod
  codes: { code: string; used: boolean; label: string }[];
};

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bez zbunjujućih 0/O/1/I
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `KLUB-${s}`;
}

// Koliko je narudžbi tog broja stvarno preuzeto (pouzeće naplaćeno).
async function collectedCount(key: string): Promise<number> {
  if (!key) return 0;
  const rows = await prisma.order.findMany({
    where: { status: { in: ["shipped", "done"] }, cashCollected: true },
    select: { phone: true }
  });
  return rows.filter((o) => phoneKey(o.phone) === key).length;
}

export async function getKlubProgress(phone: string | null | undefined): Promise<KlubProgress> {
  const s = await getSettings();
  const key = phoneKey(phone);
  const base: KlubProgress = {
    active: s.klubActive, collected: 0, target: s.klubTarget,
    inCycle: 0, remaining: s.klubTarget, earned: 0, issued: 0,
    pending: 0, hasReward: false, codes: []
  };
  if (!key) return base;

  const [collected, codes] = await Promise.all([
    collectedCount(key),
    prisma.promoCode.findMany({ where: { source: "klub", personalFor: key }, orderBy: { createdAt: "desc" } })
  ]);

  // Iskorišteni kodovi se prepoznaju po narudžbama koje ih nose.
  const used = await prisma.order.findMany({
    where: { promoCode: { in: codes.map((c) => c.code) } },
    select: { promoCode: true }
  });
  const usedSet = new Set(used.map((u) => (u.promoCode || "").toUpperCase()));

  const earned = Math.floor(collected / s.klubTarget);
  const mapped = codes.map((c) => ({ code: c.code, used: usedSet.has(c.code.toUpperCase()), label: c.label }));
  const unused = mapped.filter((c) => !c.used).length;
  const pending = Math.max(0, earned - codes.length);
  // Kad je nagrada zaslužena a još nije iskorištena, prikazujemo puni krug
  // (inače bi 3/3 zbog modula ispalo "0/3" i kupac bi mislio da nema ništa).
  const rawCycle = collected % s.klubTarget;
  const hasReward = pending > 0 || unused > 0;
  const inCycle = hasReward && rawCycle === 0 ? s.klubTarget : rawCycle;

  return {
    active: s.klubActive,
    collected,
    target: s.klubTarget,
    inCycle,
    remaining: Math.max(0, s.klubTarget - inCycle),
    earned,
    issued: codes.length,
    pending,
    hasReward,
    codes: mapped
  };
}

// Izda nagradu ako je kupac zaslužio više nego što mu je izdano.
// Vraća novi kod ili null. Siguran za višekratno pozivanje (idempotentan po pragu).
export async function issueKlubRewardIfEarned(phone: string | null | undefined): Promise<string | null> {
  const s = await getSettings();
  if (!s.klubActive) return null;

  const key = phoneKey(phone);
  if (!key) return null;

  const p = await getKlubProgress(phone);
  if (p.earned <= p.issued) return null; // još nije zaslužio novu

  // Jedinstvena šifra (u praksi nikad ne sudari, ali provjeravamo).
  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.promoCode.findUnique({ where: { code } });
    if (!exists) break;
    code = randomCode();
  }

  await prisma.promoCode.create({
    data: {
      code,
      kind: s.klubRewardKind === "freeship" ? "freeship" : s.klubRewardKind === "percent" ? "percent" : "amount",
      value: s.klubRewardValue,
      minSubtotal: 0,
      label: s.klubRewardLabel,
      active: true,
      maxUses: 1, // osobna nagrada — jednokratna
      source: "klub",
      personalFor: key,
      note: `Klub nagrada (${p.earned}. krug)`
    }
  });
  revalidateTag("promo-codes");

  return code;
}
