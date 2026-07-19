import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { PromoManager } from "@/components/admin/promo-manager";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Popust-kodovi — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PromoCodesPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  return (
    <AdminShell title="Popust-kodovi" subtitle="Napravi, ugasi i prati kodove — bez diranja koda">
      <div className="max-w-4xl">
        <PromoManager />
      </div>
    </AdminShell>
  );
}
