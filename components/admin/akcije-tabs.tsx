"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tabovi kategorije "Akcije" — Popust kodovi + Nagradna igra na jednom mjestu.
const TABS = [
  { href: "/admin/kodovi", label: "🏷️ Popust kodovi", match: ["/admin/kodovi"] },
  { href: "/admin/nagradna-igra", label: "🎁 Nagradna igra", match: ["/admin/nagradna-igra", "/admin/izvlacenje"] }
];

export function AkcijeTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-5 flex gap-1.5 overflow-x-auto rounded-[14px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-1.5">
      {TABS.map((t) => {
        const active = t.match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition ${
              active ? "bg-[var(--a-card)] text-[var(--a-text)] shadow-sm" : "text-[var(--a-text-3)] hover:text-[var(--a-text)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
