import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GiveawayDraw } from "@/components/admin/giveaway-draw";
import { isAdmin } from "@/lib/admin-auth";
import { getDrawPool } from "@/lib/giveaway";

export const metadata: Metadata = { title: "Izvlačenje — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DrawPage() {
  if (!(await isAdmin())) redirect("/admin/login/");
  const { entries, totalTickets, participants } = await getDrawPool();

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-[420px] items-center justify-between">
        <Link href="/admin/nagradna-igra" className="text-sm font-medium text-white/50 hover:text-white">← Prijave</Link>
        <span className="text-xs text-white/30">izvlačenje uživo</span>
      </div>
      <GiveawayDraw entries={entries} totalTickets={totalTickets} participants={participants} />
    </div>
  );
}
