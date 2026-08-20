import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsForm } from "@/components/admin/settings-form";
import { TeamManager } from "@/components/admin/team-manager";
import { getAdminUser, isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Postavke — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAdmin())) redirect("/admin/login/");
  const user = await getAdminUser();

  return (
    <AdminShell title="Postavke" subtitle="Cijene i podaci — mijenjaj bez diranja koda">
      <div className="max-w-3xl">
        <SettingsForm />
        {user?.role === "OWNER" && <TeamManager />}
      </div>
    </AdminShell>
  );
}
