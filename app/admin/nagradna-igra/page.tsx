import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nagradna igra — Dresify Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GiveawayAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login/");

  const entries = await prisma.giveawayEntry.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
  const registered = entries.filter((e) => e.userId).length;

  return (
    <AdminShell title="Nagradna igra — prijave" subtitle="Tko se prijavio (upisao Instagram) za PS5 giveaway">
      <div className="mb-4">
        <Link href="/admin/izvlacenje" className="inline-flex items-center gap-2 rounded-[12px] bg-accent px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-95">
          🎰 Izvuci pobjednika
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="a-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">Ukupno prijava</div>
          <div className="mt-0.5 text-2xl font-bold text-[var(--a-text)]">{entries.length}</div>
        </div>
        <div className="a-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">Registrirani</div>
          <div className="mt-0.5 text-2xl font-bold text-emerald-600">{registered}</div>
        </div>
        <div className="a-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">Gosti</div>
          <div className="mt-0.5 text-2xl font-bold text-[var(--a-text)]">{entries.length - registered}</div>
        </div>
      </div>

      <div className="a-card overflow-hidden p-0">
        {entries.length === 0 ? (
          <div className="p-6 text-sm text-[var(--a-text-3)]">Još nema prijava.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-line)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                <th className="px-4 py-2.5 font-semibold">Instagram</th>
                <th className="px-4 py-2.5 font-semibold">Ime</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Datum</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[var(--a-line)] last:border-0">
                  <td className="px-4 py-2.5">
                    <a href={`https://instagram.com/${e.handle}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--a-text)] hover:underline">
                      @{e.handle}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--a-text-2)]">{e.name || "—"}</td>
                  <td className="px-4 py-2.5">
                    {e.userId ? (
                      <span className="rounded-full bg-[var(--a-info-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--a-info)]">Registriran</span>
                    ) : (
                      <span className="text-[12px] text-[var(--a-text-3)]">Gost</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--a-text-3)]">{e.createdAt.toLocaleDateString("hr-HR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
