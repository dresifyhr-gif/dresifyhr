import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { ReklameManager } from "@/components/admin/reklame-manager";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Reklame — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReklamePage() {
  if (!(await isAdmin())) redirect("/admin/login/");
  return (
    <AdminShell title="Reklame" subtitle="Videi za Instagram i oglase">
      <div className="max-w-6xl">
        <ReklameManager />
      </div>
    </AdminShell>
  );
}
