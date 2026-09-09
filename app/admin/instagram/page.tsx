import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { InstagramConnect } from "@/components/admin/instagram-connect";
import { InstagramStatsPanel } from "@/components/admin/instagram-stats";
import { Stat } from "@/components/admin/ui";
import { getAdminUser, isAdmin } from "@/lib/admin-auth";
import { getIgStats } from "@/lib/instagram";

export const metadata = {
  title: "Instagram — Dresify Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--a-text-2)]">{children}</h3>;
}

export default async function InstagramPage() {
  if (!(await isAdmin())) redirect("/admin/login/");
  const user = await getAdminUser();
  const ig = await getIgStats();

  const followersChange =
    ig.newFollowers7d != null && ig.followers - ig.newFollowers7d > 0
      ? Math.round((ig.newFollowers7d / (ig.followers - ig.newFollowers7d)) * 100)
      : null;
  const reachChange =
    ig.reach7d != null && ig.reachPrev7d != null && ig.reachPrev7d > 0
      ? Math.round(((ig.reach7d - ig.reachPrev7d) / ig.reachPrev7d) * 100)
      : null;

  return (
    <AdminShell title="Instagram" subtitle="Statistika i objava dresova">
      {ig.ok && (
        <>
          <SectionHeading>📊 Pregled</SectionHeading>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Pratitelji"
              value={ig.followers.toLocaleString("hr-HR")}
              change={followersChange}
              sub={ig.newFollowers7d != null ? `${ig.newFollowers7d >= 0 ? "+" : ""}${ig.newFollowers7d.toLocaleString("hr-HR")} u 7 dana` : undefined}
            />
            <Stat label="Doseg (7 dana)" value={ig.reach7d != null ? ig.reach7d.toLocaleString("hr-HR") : "—"} change={reachChange} />
            <Stat label="Novi (7 dana)" value={ig.newFollowers7d != null ? `${ig.newFollowers7d >= 0 ? "+" : ""}${ig.newFollowers7d.toLocaleString("hr-HR")}` : "—"} />
            <Stat label="Objava ukupno" value={ig.mediaCount != null ? ig.mediaCount.toLocaleString("hr-HR") : "—"} />
          </div>
        </>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <InstagramStatsPanel ig={ig} />
        <InstagramConnect isOwner={user?.role === "OWNER"} />
      </div>

      <p className="mt-5 text-[12px] text-[var(--a-text-3)]">
        Dresove objavljuješ jednim klikom sa stranice <b className="text-[var(--a-text-2)]">Proizvodi</b> — gumb „📸 Objavi na IG&quot; na kartici proizvoda.
      </p>
    </AdminShell>
  );
}
