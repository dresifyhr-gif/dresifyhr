import QRCode from "qrcode";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getOrderReference } from "@/lib/orders";
import { getKlubProgress } from "@/lib/klub";
import { deliverNewsletterSignup } from "@/lib/newsletter";
import { phoneKey } from "@/lib/utils";
import { AddressManager } from "@/components/site/address-manager";

export const metadata = { title: "Moj Dresify", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const eur = (n: number) => `${(n ?? 0).toLocaleString("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const DAY = 24 * 60 * 60 * 1000;

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "U obradi", cls: "bg-sky-500/15 text-sky-300" },
  shipped: { label: "Poslano", cls: "bg-indigo-500/15 text-indigo-300" },
  done: { label: "Završeno", cls: "bg-emerald-500/15 text-emerald-300" },
  returned: { label: "Vraćeno", cls: "bg-red-500/15 text-red-300" },
  cancelled: { label: "Otkazano", cls: "bg-white/10 text-white/50" }
};

const TIERS = [
  { name: "Rookie Fan", min: 0, emoji: "⚽" },
  { name: "Ultra Fan", min: 100, emoji: "🔥" },
  { name: "Legend", min: 500, emoji: "👑" },
  { name: "GOAT", min: 1500, emoji: "💎" }
];

const NAV = [
  { href: "#pregled", label: "Pregled", icon: "🏠" },
  { href: "#narudzbe", label: "Moje narudžbe", icon: "📦" },
  { href: "#kuponi", label: "Moji kuponi", icon: "🎟️" },
  { href: "#adrese", label: "Moje adrese", icon: "📍" },
  { href: "#iskaznica", label: "Članska iskaznica", icon: "💳" },
  { href: "#postignuca", label: "Postignuća", icon: "🏆" }
];
const SOON = ["Omiljeni proizvodi", "Obavijesti"];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}
    </div>
  );
}

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/prijava");

  const email = (user.primaryEmailAddress?.emailAddress || "").toLowerCase();
  const clerkPhone = user.primaryPhoneNumber?.phoneNumber || "";
  const firstName = user.firstName || (email ? email.split("@")[0] : "") || "navijaču";
  const avatar = user.imageUrl;

  // Auto-prijava na newsletter kod prve posjete profila (kao drugi webshopovi).
  // Idempotentno: zapamti u Clerk metapodacima da se ne ponavlja svaki put.
  if (email && !(user.publicMetadata as { newsletter?: boolean })?.newsletter) {
    deliverNewsletterSignup(email).catch(() => {});
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(user.id, { publicMetadata: { newsletter: true } });
    } catch {}
  }

  const candidates = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 400,
    select: { id: true, createdAt: true, status: true, total: true, shipping: true, itemCount: true, tracking: true, deliveryStatus: true, email: true, phone: true }
  });
  const clerkPk = phoneKey(clerkPhone);
  const orders = candidates.filter(
    (o) => (email && (o.email || "").toLowerCase() === email) || (clerkPk && phoneKey(o.phone) === clerkPk)
  );

  const orderPhone = clerkPhone || orders.find((o) => o.phone)?.phone || "";
  const pk = phoneKey(orderPhone);

  const [klub, personalCodes] = await Promise.all([
    getKlubProgress(orderPhone),
    pk
      ? prisma.promoCode.findMany({
          where: { personalFor: pk, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([])
  ]);

  const collected = orders.filter((o) => o.status === "shipped" || o.status === "done");
  const spent = collected.reduce((s, o) => s + (o.total - (o.shipping ?? 0)), 0);
  const itemsTotal = orders.reduce((s, o) => s + (o.itemCount ?? 0), 0);
  const now = Date.now();
  const firstOrder = orders.length ? orders[orders.length - 1].createdAt : new Date();
  const recent30 = orders.filter((o) => now - o.createdAt.getTime() < 30 * DAY).length;

  const xp = collected.length * 100 + Math.floor(spent);
  let tierIdx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) if (xp >= TIERS[i].min) { tierIdx = i; break; }
  const tier = TIERS[tierIdx];
  const next = TIERS[tierIdx + 1];
  const tierPct = next ? Math.min(100, Math.round(((xp - tier.min) / (next.min - tier.min)) * 100)) : 100;

  const active = orders.find((o) => o.status === "shipped" && !o.deliveryStatus?.includes("delivered")) || orders.find((o) => o.status === "shipped");

  const achievements = [
    { emoji: "🛍️", name: "Kolekcionar", desc: "10+ artikala", earned: itemsTotal >= 10 },
    { emoji: "🔥", name: tier.name, desc: `Razina ${tierIdx + 1}`, earned: tierIdx >= 1 },
    { emoji: "📅", name: "Vjerni kupac", desc: "1 godina s nama", earned: now - firstOrder.getTime() > 365 * DAY },
    { emoji: "⚡", name: "Brzi kupac", desc: "5 narudžbi / 30 dana", earned: recent30 >= 5 }
  ];

  // Digitalna iskaznica — QR s identifikatorom kupca (za buduću provjeru/skeniranje).
  const memberId = (pk || email || user.id).toString();
  const qr = await QRCode.toDataURL(`DRESIFY:${memberId}`, { margin: 1, width: 220, color: { dark: "#0a0a0a", light: "#e8ff3c" } });

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 text-white sm:px-4 sm:py-8">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr] lg:gap-6">
        {/* SIDEBAR */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {avatar && <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10" />}
              <div className="min-w-0">
                <div className="truncate font-bold">{firstName}</div>
                <div className="truncate text-[11px] text-white/40">{email}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="text-xs font-semibold">{tier.emoji} {tier.name}</span>
              <span className="text-[11px] tabular-nums text-white/50">{xp} XP</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${tierPct}%` }} />
            </div>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] p-2 lg:flex-col lg:overflow-visible">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
                <span>{n.icon}</span> {n.label}
              </a>
            ))}
            <div className="mt-1 hidden border-t border-white/10 pt-2 lg:block">
              {SOON.map((s) => (
                <div key={s} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white/30">
                  <span>{s}</span>
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">uskoro</span>
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {/* CONTENT */}
        <div className="min-w-0 space-y-3 sm:space-y-4">
          {/* Header */}
          <div id="pregled" className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl uppercase leading-none tracking-wide">Bok, {firstName}! 👋</h1>
              <p className="mt-1 text-sm text-white/50">Dobrodošao natrag u svoj Dresify profil.</p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Narudžbi" value={String(orders.length)} sub={recent30 ? `+${recent30} u 30 dana` : undefined} />
            <Stat label="Potrošeno" value={eur(spent)} />
            <Stat label="Klub" value={`${klub.inCycle}/${klub.target}`} sub={klub.hasReward ? "🎁 mystery gift spreman!" : `još ${klub.remaining} do mystery gift-a`} />
            <Stat label="Kuponi" value={String(personalCodes.length)} sub="aktivni" />
          </div>

          {/* XP panel */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-fuchsia-600/10 to-transparent p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">{tier.emoji}</div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Dresify XP · Razina {tierIdx + 1}</div>
                  <div className="text-xl font-bold">{tier.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">{xp} XP</div>
                {next && <div className="text-[11px] text-white/50">do {next.name}: {next.min - xp} XP</div>}
              </div>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all" style={{ width: `${tierPct}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TIERS.map((tr, i) => (
                <span key={tr.name} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${i === tierIdx ? "bg-white/20 text-white" : "bg-white/5 text-white/40"}`}>
                  {tr.emoji} {tr.name}
                </span>
              ))}
            </div>
          </div>

          {/* Aktivna pošiljka */}
          {active && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="font-heading text-lg uppercase tracking-wide">Pošiljka u tijeku 🚚</div>
                <span className="text-xs text-white/40">#{getOrderReference(active.createdAt.toISOString())}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {["Zaprimljeno", "Pakiranje", "Na dostavi", "Dostavljeno"].map((step, i) => {
                  const reached = (active.deliveryStatus === "delivered" ? 3 : active.deliveryStatus === "transit" ? 2 : 1) >= i;
                  return (
                    <div key={step} className="flex flex-1 flex-col items-center">
                      <div className={`h-2.5 w-full rounded-full ${reached ? "bg-accent" : "bg-white/10"}`} />
                      <span className={`mt-1.5 text-[10px] ${reached ? "text-white" : "text-white/40"}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
              {active.tracking && <div className="mt-3 text-xs text-white/50">Broj pošiljke: <span className="font-semibold text-white">{active.tracking}</span></div>}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Narudžbe */}
            <div id="narudzbe" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <div className="mb-3 font-heading text-lg uppercase tracking-wide">Moje narudžbe</div>
              {orders.length === 0 ? (
                <div className="py-3 text-center text-[13px] text-white/50">
                  Nemamo narudžbi povezanih s tvojim računom.
                  <br />
                  <span className="text-white/30">Povezuju se po emailu ili broju mobitela s kojim si naručivao.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 6).map((o) => {
                    const st = STATUS[o.status] || { label: o.status, cls: "bg-white/10 text-white/60" };
                    return (
                      <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-sm font-bold">#{getOrderReference(o.createdAt.toISOString())}</div>
                          <div className="text-[11px] text-white/40">{o.createdAt.toLocaleDateString("hr-HR")} · {o.itemCount ?? 0} art.</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-bold tabular-nums">{eur(o.total - (o.shipping ?? 0))}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kuponi */}
            <div id="kuponi" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <div className="mb-3 font-heading text-lg uppercase tracking-wide">Moji kuponi</div>
              {personalCodes.length === 0 ? (
                <div className="py-3 text-center text-[13px] text-white/50">
                  Još nemaš osobnih kupona.
                  <br />
                  <span className="text-white/30">Kroz Dresify Klub i Kolo sreće zaslužuješ popuste.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {personalCodes.map((c) => (
                    <div key={c.code} className="flex items-center justify-between rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2.5">
                      <div>
                        <div className="text-base font-bold text-accent">
                          {c.kind === "freeship" ? "GRATIS DOSTAVA" : c.value > 0 ? `${c.value}% POPUSTA` : (c.label || "🎁 NAGRADA")}
                        </div>
                        <div className="text-[11px] text-white/40">{c.value > 0 || c.kind === "freeship" ? (c.label || "Osobni kupon") : "Klub nagrada · stiže uz narudžbu"}{c.minSubtotal ? ` · min ${eur(c.minSubtotal)}` : ""}</div>
                      </div>
                      <code className="rounded bg-black/40 px-2 py-1 text-xs font-bold tracking-wider text-white">{c.code}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Adrese */}
          <div id="adrese" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="mb-3 font-heading text-lg uppercase tracking-wide">Moje adrese</div>
            <AddressManager />
          </div>

          {/* Članska iskaznica */}
          <div id="iskaznica" className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="font-heading text-2xl uppercase tracking-wide text-accent">Dresify klub</div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Član</div>
                <div className="text-lg font-bold">{firstName}</div>
                <div className="mt-2 flex gap-4 text-xs text-white/50">
                  <div><span className="text-white/30">Razina</span><br /><span className="font-semibold text-white">{tier.emoji} {tier.name}</span></div>
                  <div><span className="text-white/30">Član od</span><br /><span className="font-semibold text-white">{firstOrder.getFullYear()}</span></div>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Članska iskaznica QR" className="h-32 w-32 rounded-xl bg-accent p-1" />
            </div>
            <div className="border-t border-white/10 bg-black/20 px-5 py-2 text-[11px] text-white/40">
              Skeniraj za buduće pogodnosti, popuste i nagradne igre.
            </div>
          </div>

          {/* Bedževi */}
          <div id="postignuca" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="mb-3 font-heading text-lg uppercase tracking-wide">Postignuća</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {achievements.map((a) => (
                <div key={a.name} className={`rounded-xl border p-3 text-center ${a.earned ? "border-accent/40 bg-accent/5" : "border-white/10 bg-white/[0.02] opacity-50"}`}>
                  <div className="text-2xl">{a.emoji}</div>
                  <div className="mt-1 text-xs font-bold">{a.name}</div>
                  <div className="text-[10px] text-white/40">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
