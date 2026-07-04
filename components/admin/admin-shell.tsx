"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutDashboard, Package, Send, Users, BarChart3, LogOut } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Pregled", icon: LayoutDashboard },
  { href: "/admin/narudzbe", label: "Narudžbe", icon: Package },
  { href: "/admin/slanje", label: "Za slanje", icon: Send },
  { href: "/admin/kupci", label: "Kupci", icon: Users },
  { href: "/admin/analitika", label: "Analitika", icon: BarChart3 }
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            D<span className="text-lime-400">R</span>
          </div>
          <div className="text-[15px] font-bold tracking-tight">Dresify</div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <a
          href="/api/admin/logout"
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Odjava
        </a>
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3.5 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white lg:hidden">
              D<span className="text-lime-400">R</span>
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900">{title}</div>
              <div className="hidden text-xs text-slate-400 sm:block">
                {new Date().toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
          </div>
          <a
            href="/api/admin/logout"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition hover:text-slate-800 lg:hidden"
          >
            Odjava
          </a>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-5 pb-24 sm:px-6 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                active ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-slate-900" : "text-slate-400"}`} />
              {item.label}
              {active && <span className="mt-0.5 h-0.5 w-5 rounded-full bg-lime-400" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
