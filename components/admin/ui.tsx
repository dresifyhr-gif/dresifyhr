import type { ReactNode } from "react";

export const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

// wa.me link from a Croatian phone number (best-effort normalization).
export function waLink(phone: string | null) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "385" + d.slice(1);
  else if (!d.startsWith("385")) d = "385" + d;
  return d.length >= 11 ? `https://wa.me/${d}` : null;
}

export function Stat({
  label,
  value,
  profit,
  sub,
  change
}: {
  label: string;
  value: string;
  profit?: string;
  sub?: string;
  change?: number | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
        {change != null && (
          <span className={`text-[11px] font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {profit && <div className="mt-0.5 text-xs font-semibold text-emerald-600">{profit} profit</div>}
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
      {children}
    </div>
  );
}
