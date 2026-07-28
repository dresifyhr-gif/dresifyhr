"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutDashboard, Package, Users, BarChart3, Shirt, LogOut, Search, Settings, Ticket } from "lucide-react";

import { AdminAiDock } from "@/components/admin/admin-ai-dock";
import { CommandPalette } from "@/components/admin/command-palette";

const NAV = [
  { href: "/admin", label: "Pregled", hint: "Početna", icon: LayoutDashboard },
  { href: "/admin/narudzbe", label: "Narudžbe", hint: "Traži i mijenjaj", icon: Package },
  { href: "/admin/proizvodi", label: "Proizvodi", hint: "Cijena i zaliha", icon: Shirt },
  { href: "/admin/kupci", label: "Kupci", hint: "Tko kupuje", icon: Users },
  { href: "/admin/kodovi", label: "Kodovi", hint: "Popusti", icon: Ticket },
  { href: "/admin/analitika", label: "Analitika", hint: "Brojke i trendovi", icon: BarChart3 }
];

function isActive(pathname: string, href: string) {
  // trailingSlash: true → putanja je "/admin/", pa uspoređujemo bez završne crte.
  const p = pathname.replace(/\/+$/, "") || "/admin";
  return href === "/admin" ? p === "/admin" : p.startsWith(href);
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/favicon.png" alt="Dresify" className="h-9 w-9 rounded-xl object-cover" />
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight text-[#1d1d1f]">Dresify</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e8e93]">Admin</div>
      </div>
    </Link>
  );
}

export function AdminShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-root min-h-screen overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/[0.06] bg-white lg:flex">
        <div className="px-5 py-6">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-all duration-150 ${
                  active ? "bg-accent/60 text-[#1d1d1f]" : "text-[#6e6e73] hover:bg-black/[0.04]"
                }`}
              >
                <Icon className={`h-[19px] w-[19px] ${active ? "text-[#1d1d1f]" : "text-[#8e8e93] group-hover:text-[#1d1d1f]"}`} />
                <span className="flex flex-col">
                  <span className="text-[14px] font-semibold leading-tight">{item.label}</span>
                  <span className={`text-[11px] leading-tight ${active ? "text-[#1d1d1f]/55" : "text-[#8e8e93]"}`}>{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        <a
          href="/api/admin/logout"
          className="m-3 flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium text-[#8e8e93] transition hover:bg-black/[0.04] hover:text-[#1d1d1f]"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Odjava
        </a>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="a-blur sticky top-0 z-20 border-b border-black/[0.06] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{title}</h1>
              {subtitle && <p className="text-[12px] text-[#8e8e93]">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
                className="a-input flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#8e8e93] transition hover:text-[#1d1d1f]"
                title="Globalno pretraživanje (⌘K)"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Traži…</span>
                <kbd className="hidden rounded-[10px] bg-black/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-[#8e8e93] sm:inline">⌘K</kbd>
              </button>
              <Link
                href="/admin/postavke"
                className="a-input flex h-8 w-8 items-center justify-center text-[#8e8e93] transition hover:text-[#1d1d1f]"
                title="Postavke"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <a
                href="/api/admin/logout"
                className="a-input px-3 py-1.5 text-xs font-medium text-[#6e6e73] transition hover:text-[#1d1d1f] lg:hidden"
              >
                Odjava
              </a>
            </div>
          </div>
          {/* Mobile page title */}
          <div className="mt-3 lg:hidden">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{title}</h1>
            {subtitle && <p className="text-[12px] text-[#8e8e93]">{subtitle}</p>}
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>

      {/* Global AI assistant — available on every page */}
      <AdminAiDock />

      {/* Globalno pretraživanje (⌘K) */}
      <CommandPalette />

      {/* Mobile bottom nav */}
      <nav className="a-blur fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-black/[0.06] pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition ${
                active ? "text-[#1d1d1f]" : "text-[#8e8e93]"
              }`}
            >
              <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-150 ${active ? "bg-accent/60" : ""}`}>
                <Icon className={`h-[18px] w-[18px] ${active ? "text-[#1d1d1f]" : "text-[#8e8e93]"}`} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
