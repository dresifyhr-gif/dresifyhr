import type { ReactNode } from "react";

export const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

// "12 dresova + 3 kompleta" (izostavi dio koji je 0; ako oba 0 → "0 kom").
export const komLabel = (dresovi: number, kompleti: number) => {
  const parts: string[] = [];
  if (dresovi > 0) parts.push(`${dresovi} ${dresovi === 1 ? "dres" : "dresova"}`);
  if (kompleti > 0) parts.push(`${kompleti} ${kompleti === 1 ? "komplet" : "kompleta"}`);
  return parts.length ? parts.join(" + ") : "0 kom";
};

// wa.me link from a Croatian phone number (best-effort normalization).
export function waLink(phone: string | null) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "385" + d.slice(1);
  else if (!d.startsWith("385")) d = "385" + d;
  return d.length >= 11 ? `https://wa.me/${d}` : null;
}

// wa.me link with a pre-filled message (opens WhatsApp with text ready to send).
export function waLinkText(phone: string | null, text: string) {
  const base = waLink(phone);
  return base ? `${base}?text=${encodeURIComponent(text)}` : null;
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
    <div className="a-card p-4">
      <div className="flex items-center justify-between">
        <div className="a-label">{label}</div>
        {change != null && (
          <span className={`text-[11px] font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[26px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">{value}</div>
      {profit && <div className="mt-0.5 text-xs font-semibold text-emerald-600">{profit} profit</div>}
      {sub && <div className="mt-0.5 text-xs text-[#8e8e93]">{sub}</div>}
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="a-card p-5">
      <div className="a-label mb-4">{title}</div>
      {children}
    </div>
  );
}
