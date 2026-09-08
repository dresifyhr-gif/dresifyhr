import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsForm } from "@/components/admin/settings-form";
import { TeamManager } from "@/components/admin/team-manager";
import { PushToggle } from "@/components/admin/push-toggle";
import { getAdminUser, isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Postavke — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAdmin())) redirect("/admin/login/");
  const user = await getAdminUser();
  // Postavke su samo za vlasnika — osoblje/partner nema pristup.
  if (user?.role !== "OWNER") redirect("/admin");

  return (
    <AdminShell title="Postavke" subtitle="Cijene i podaci — mijenjaj bez diranja koda">
      <div className="max-w-3xl space-y-5">
        <PushToggle />

        {/* Akcije — premješteno iz glavnog izbornika u Postavke (prečac na stranice) */}
        <div className="rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-4">
          <div className="font-semibold text-[var(--a-text)]">🎟️ Akcije</div>
          <p className="mt-0.5 text-[12px] text-[var(--a-text-2)]">Popust kodovi, Dresify klub, nagradna igra i izvlačenje.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/admin/kodovi" className="a-btn a-btn-sm px-3 py-2 text-[13px]">🎟️ Kodovi i klub</a>
            <a href="/admin/nagradna-igra" className="a-btn a-btn-sm px-3 py-2 text-[13px]">🎡 Nagradna igra</a>
            <a href="/admin/izvlacenje" className="a-btn a-btn-sm px-3 py-2 text-[13px]">🎲 Izvlačenje</a>
          </div>
        </div>

        <SettingsForm />
        {user?.role === "OWNER" && <TeamManager />}
      </div>
    </AdminShell>
  );
}
