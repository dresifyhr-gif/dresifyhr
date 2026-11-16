import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { MediaDesk } from "@/components/admin/media-desk";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Media — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = ["danas", "nacrti", "kanal", "kalendar", "rezultati", "arhiva", "redakcija", "reklame"] as const;
type Tab = (typeof TABS)[number];

export default async function MediaPage({ searchParams }: { searchParams?: { tab?: string; item?: string } }) {
  if (!(await isAdmin())) redirect("/admin/login/");
  const tab = (TABS as readonly string[]).includes(searchParams?.tab || "") ? (searchParams!.tab as Tab) : "danas";
  return (
    <AdminShell title="Media" subtitle="Ideje, nacrti i objave za @dresify.hr">
      <div className="max-w-6xl">
        <MediaDesk initialTab={tab} focusId={typeof searchParams?.item === "string" ? searchParams.item.slice(0, 40) : undefined} />
      </div>
    </AdminShell>
  );
}
