import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { isAdmin } from "@/lib/admin-auth";
import { getKlubProgress, issueKlubRewardIfEarned } from "@/lib/klub";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatCroatianName, formatCroatianPhone, phoneKey, repairText } from "@/lib/utils";

export const metadata: Metadata = { title: "Kupac — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Nova", cls: "bg-sky-100 text-sky-700" },
  shipped: { label: "Poslana", cls: "bg-indigo-100 text-indigo-700" },
  done: { label: "Završena", cls: "bg-emerald-100 text-emerald-700" },
  returned: { label: "Vraćena", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Otkazana", cls: "bg-red-100 text-red-700" }
};

export default async function CustomerProfilePage({ params }: { params: Promise<{ phone: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login/");

  const { phone: phoneParam } = await params;
  const key = phoneKey(decodeURIComponent(phoneParam));
  if (!key) notFound();

  // Sve narudžbe tog telefona (mali skup → filtriramo u JS-u po ključu).
  const all = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { klub: true, igrac: true, size: true, quantity: true, unitPrice: true } } }
  });
  const orders = all.filter((o) => phoneKey(o.phone) === key);
  if (orders.length === 0) notFound();

  const isSent = (s: string) => s === "shipped" || s === "done";
  const latest = orders[0];
  const name = formatCroatianName(latest.customerName || "");
  const phoneDisplay = formatCroatianPhone(latest.phone || "");
  const email = orders.find((o) => o.email)?.email || "";
  const address = repairText(orders.find((o) => o.address)?.address || "");

  // Statistika
  const collected = orders.filter((o) => isSent(o.status) && o.cashCollected);
  // Rizik = samo vraćene pošiljke (kupac odbio pouzeće). Otkazane ne — njih otkaže Gazda.
  const failed = orders.filter((o) => o.status === "returned");
  const pending = orders.filter((o) => isSent(o.status) && !o.cashCollected);
  const totalSpent = collected.reduce((s, o) => s + (o.total - (o.shipping ?? 0)), 0);
  const firstAt = orders[orders.length - 1].createdAt;
  const wa = latest.phone ? `https://wa.me/${String(latest.phone).replace(/\D/g, "").replace(/^00/, "")}` : null;
  // Nagrade zaslužene prije uvođenja Kluba (ili propuštene) izdaju se ovdje —
  // idempotentno je i vidi ga samo admin.
  await issueKlubRewardIfEarned(latest.phone).catch(() => null);
  const klub = await getKlubProgress(latest.phone);

  const Stat = ({ label, value, cls = "text-[var(--a-text)]" }: { label: string; value: string; cls?: string }) => (
    <div className="rounded-[12px] border border-[var(--a-line)] bg-[var(--a-card)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${cls}`}>{value}</div>
    </div>
  );

  return (
    <AdminShell title={name || "Kupac"} subtitle="Profil kupca — sve narudžbe i podaci na jednom mjestu">
      <div className="mb-4">
        <Link href="/admin/kupci" className="text-sm font-medium text-[var(--a-text-2)] hover:text-[var(--a-text)]">← Natrag na kupce</Link>
      </div>

      {/* Kontakt + rizik */}
      <div className="mb-4 a-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--a-text)]">{name || "—"}</h2>
              {failed.length > 0 && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                  ⚠️ Rizičan · {failed.length}× odbio
                </span>
              )}
            </div>
            <div className="mt-1 space-y-0.5 text-sm text-[var(--a-text-2)]">
              {phoneDisplay && <div>📞 {phoneDisplay}</div>}
              {email && <div>✉️ {email}</div>}
              {address && <div>📍 {address}</div>}
            </div>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-[12px] bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Dresify Klub */}
      {klub.active && (
        <div className="mb-4 a-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold text-[var(--a-text)]">🎁 Dresify Klub</div>
              <div className="mt-0.5 text-[13px] text-[var(--a-text-2)]">
                {klub.inCycle}/{klub.target} preuzetih narudžbi
                {klub.remaining > 0 ? <> — još <b>{klub.remaining}</b> do nagrade</> : <> — <b className="text-emerald-600">nagrada spremna</b></>}
                {klub.earned > 0 && <> · zaslužio <b>{klub.earned}</b>×</>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {klub.codes.length === 0 ? (
                <span className="text-[12px] text-[var(--a-text-3)]">još nema nagrada</span>
              ) : (
                klub.codes.map((c) => (
                  <span key={c.code} className={`rounded-[10px] px-2 py-1 font-mono text-[12px] font-bold ${c.used ? "bg-[var(--a-surface-2)] text-[var(--a-text-3)] line-through" : "bg-accent/60 text-[var(--a-text)]"}`}>
                    {c.code}{c.used ? "" : " ✓"}
                  </span>
                ))
              )}
            </div>
          </div>
          {/* Traka napretka */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--a-surface-2)]">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((klub.inCycle / klub.target) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Statistika */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ukupno narudžbi" value={String(orders.length)} />
        <Stat label="Potrošeno (preuzeto)" value={eur(totalSpent)} cls="text-emerald-600" />
        <Stat label="Preuzeto / čeka" value={`${collected.length} / ${pending.length}`} />
        <Stat label="Vraćene pošiljke" value={String(failed.length)} cls={failed.length ? "text-red-600" : "text-[var(--a-text)]"} />
      </div>
      <div className="mb-5 text-xs text-[var(--a-text-3)]">
        Prvi put: {firstAt.toLocaleDateString("hr-HR")} · Zadnji put: {latest.createdAt.toLocaleDateString("hr-HR")}
      </div>

      {/* Sve narudžbe */}
      <div className="a-card p-4 sm:p-5">
        <div className="mb-3 text-sm font-bold text-[var(--a-text)]">Sve narudžbe ({orders.length})</div>
        <div className="space-y-2">
          {orders.map((o) => {
            const st = STATUS[o.status] || { label: o.status, cls: "bg-[var(--a-surface-2)] text-[var(--a-text-2)]" };
            const goods = o.total - (o.shipping ?? 0);
            const ref = o.reference || getOrderReference(o.createdAt.toISOString());
            return (
              <div key={o.id} className="rounded-[12px] border border-[var(--a-line)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--a-text-2)]">{o.createdAt.toLocaleDateString("hr-HR")}</span>
                    <span className="text-[11px] text-[var(--a-text-3)]">{ref}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                    {isSent(o.status) && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${o.cashCollected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {o.cashCollected ? "naplaćeno" : "čeka naplatu"}
                      </span>
                    )}
                    {o.shippedBy && <span className="text-[10px] text-[var(--a-text-3)]">({o.shippedBy})</span>}
                  </div>
                  <span className="text-sm font-semibold text-[var(--a-text)]">{eur(goods)}</span>
                </div>
                <div className="mt-1 text-xs text-[var(--a-text-2)]">
                  {o.items.map((it) => `${repairText([it.klub, it.igrac].filter(Boolean).join(" "))}${it.size ? ` (${it.size})` : ""}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`).join(" · ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
