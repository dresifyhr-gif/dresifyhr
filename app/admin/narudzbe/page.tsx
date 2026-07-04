import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrdersManager } from "@/components/admin/orders-manager";
import { AdminShell } from "@/components/admin/admin-shell";
import { Panel } from "@/components/admin/ui";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Narudžbe — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  return (
    <AdminShell title="Sve narudžbe">
      <Panel title="Traži i mijenjaj status bilo koje narudžbe">
        <OrdersManager />
      </Panel>
    </AdminShell>
  );
}
