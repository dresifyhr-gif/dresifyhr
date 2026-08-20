import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { AkcijeTabs } from "@/components/admin/akcije-tabs";
import { PromoManager } from "@/components/admin/promo-manager";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Akcije — Popust-kodovi — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PromoCodesPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  return (
    <AdminShell title="Akcije" subtitle="Popust-kodovi i nagradna igra">
      <div className="max-w-4xl">
        <AkcijeTabs />
        <PromoManager />
      </div>
    </AdminShell>
  );
}
