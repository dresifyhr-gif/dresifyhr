import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { GlsPayout } from "@/components/admin/gls-payout";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "GLS isplata — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GlsPayoutPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  return (
    <AdminShell title="GLS isplata" subtitle="Upiši iznos uplate → označi prikupljeno">
      <div className="max-w-3xl">
        <GlsPayout />
      </div>
    </AdminShell>
  );
}
