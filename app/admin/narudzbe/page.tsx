import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrdersManager } from "@/components/admin/orders-manager";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Narudžbe — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900">Sve narudžbe</div>
            <div className="text-xs text-slate-400">Traži i mijenjaj status bilo koje narudžbe</div>
          </div>
          <a href="/admin" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition hover:text-slate-800">
            ← Dashboard
          </a>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <OrdersManager />
        </div>
      </div>
    </div>
  );
}
