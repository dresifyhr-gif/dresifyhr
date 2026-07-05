import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrdersManager } from "@/components/admin/orders-manager";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Narudžbe — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  return (
    <AdminShell title="Narudžbe" subtitle="Pronađi bilo koju narudžbu i promijeni status">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <OrdersManager />
      </div>
    </AdminShell>
  );
}
