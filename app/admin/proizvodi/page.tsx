import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductsManager } from "@/components/admin/products-manager";
import { CustomProducts } from "@/components/admin/custom-products";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Proizvodi — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  return (
    <AdminShell title="Proizvodi" subtitle="Dodaj dresove, uredi cijenu i zalihu — bez koda">
      <CustomProducts />
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <ProductsManager />
      </div>
    </AdminShell>
  );
}
