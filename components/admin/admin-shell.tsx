"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutDashboard, Package, Users, BarChart3, Shirt, LogOut, Search, Settings } from "lucide-react";

import { AdminAiDock } from "@/components/admin/admin-ai-dock";
import { CommandPalette } from "@/components/admin/command-palette";

const NAV = [
  { href: "/admin", label: "Pregled", hint: "Početna", icon: LayoutDashboard },
  { href: "/admin/narudzbe", label: "Narudžbe", hint: "Traži i mijenjaj", icon: Package },
  { href: "/admin/proizvodi", label: "Proizvodi", hint: "Cijena i zaliha", icon: Shirt },
  { href: "/admin/kupci", label: "Kupci", hint: "Tko kupuje", icon: Users },
  { href: "/admin/analitika", label: "Analitika", hint: "Brojke i trendovi", icon: BarChart3 }
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
        D<span className="text-lime-400">R</span>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight text-slate-900">Dresify</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Admin</div>
      </div>
    </Link>
  );
}

export function AdminShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-5 py-5">
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
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className={`h-[19px] w-[19px] ${active ? "text-lime-400" : "text-slate-400 group-hover:text-slate-600"}`} />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold leading-tight">{item.label}</span>
                  <span className={`text-[11px] leading-tight ${active ? "text-white/60" : "text-slate-400"}`}>{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        <a
          href="/api/admin/logout"
          className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Odjava
        </a>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-400 shadow-sm transition hover:text-slate-700"
                title="Globalno pretraživanje (⌘K)"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Traži…</span>
                <kbd className="hidden rounded border border-slate-200 px-1 py-0.5 text-[9px] font-semibold text-slate-400 sm:inline">⌘K</kbd>
              </button>
              <Link
                href="/admin/postavke"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:text-slate-700"
                title="Postavke"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <a
                href="/api/admin/logout"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition hover:text-slate-800 lg:hidden"
              >
                Odjava
              </a>
            </div>
          </div>
          {/* Mobile page title */}
          <div className="mt-3 lg:hidden">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>

      {/* Global AI assistant — available on every page */}
      <AdminAiDock />

      {/* Globalno pretraživanje (⌘K) */}
      <CommandPalette />

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition ${
                active ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${active ? "bg-slate-900" : ""}`}>
                <Icon className={`h-[18px] w-[18px] ${active ? "text-lime-400" : "text-slate-400"}`} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
