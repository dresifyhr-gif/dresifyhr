import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getOrderReference } from "@/lib/orders";
import { phoneKey } from "@/lib/utils";

export const metadata = { title: "Moj Dresify", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const eur = (n: number) => `${(n ?? 0).toLocaleString("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "U obradi", cls: "bg-sky-500/15 text-sky-300" },
  shipped: { label: "Poslano", cls: "bg-indigo-500/15 text-indigo-300" },
  done: { label: "Završeno", cls: "bg-emerald-500/15 text-emerald-300" },
  returned: { label: "Vraćeno", cls: "bg-red-500/15 text-red-300" },
  cancelled: { label: "Otkazano", cls: "bg-white/10 text-white/50" }
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/prijava");

  const email = (user.primaryEmailAddress?.emailAddress || "").toLowerCase();
  const phone = user.primaryPhoneNumber?.phoneNumber || "";
  const pk = phoneKey(phone);
  const firstName = user.firstName || (email ? email.split("@")[0] : "") || "";

  // Narudžbe povezane po emailu ili broju mobitela (skup je malen → filtriramo u JS-u).
  const candidates = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, createdAt: true, status: true, total: true, shipping: true, itemCount: true, tracking: true, deliveryStatus: true, email: true, phone: true }
  });
  const orders = candidates.filter(
    (o) => (email && (o.email || "").toLowerCase() === email) || (pk && phoneKey(o.phone) === pk)
  );
  const collected = orders.filter((o) => o.status === "shipped" || o.status === "done");
  const spent = collected.reduce((s, o) => s + (o.total - (o.shipping ?? 0)), 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-bebas)] text-3xl tracking-wide">Bok{firstName ? `, ${firstName}` : ""}! 👋</h1>
          <p className="mt-1 text-sm text-white/60">Dobrodošao u svoj Dresify profil.</p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Sažetak */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Narudžbi</div>
          <div className="mt-1 text-2xl font-bold">{orders.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Ukupno</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{eur(spent)}</div>
        </div>
        <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Email</div>
          <div className="mt-1 truncate text-sm font-semibold">{email || "—"}</div>
        </div>
      </div>

      {/* Narudžbe */}
      <h2 className="mt-8 mb-3 font-[var(--font-bebas)] text-xl tracking-wide">Moje narudžbe</h2>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          Nemamo narudžbi povezanih s tvojim računom.
          <br />
          <span className="text-white/40">Narudžbe se povezuju po email adresi ili broju mobitela s kojim si naručivao.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const st = STATUS[o.status] || { label: o.status, cls: "bg-white/10 text-white/60" };
            return (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold">#{getOrderReference(o.createdAt.toISOString())}</div>
                  <div className="text-xs text-white/50">
                    {o.createdAt.toLocaleDateString("hr-HR")} · {o.itemCount ?? 0} art.
                    {o.tracking ? <> · {o.tracking}</> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold tabular-nums">{eur(o.total - (o.shipping ?? 0))}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
