import type { OldUnshippedRow } from "@/lib/admin-winback";
import { eur } from "@/components/admin/ui";
import { formatCroatianName } from "@/lib/utils";

// Presentational (server) lists shared by Pregled + Za slanje.

export function ApologyList({ rows }: { rows: OldUnshippedRow[] }) {
  return (
    <>
      <p className="mb-3 -mt-2 text-xs text-slate-400">
        Prošlo je dosta od narudžbe, a nije poslana. Klikni „WhatsApp isprika” — poruka je već napisana, samo pošalji (možeš je urediti prije slanja).
      </p>
      <ul className="space-y-2">
        {rows.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-sm">
            <span className="min-w-0 truncate text-slate-700">
              <span className="text-slate-400">{o.dateLabel}</span> · {o.name}{" "}
              <span className="text-slate-400">· {o.product} · {eur(o.total)}</span>
            </span>
            {o.wa ? (
              <a
                href={o.wa}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600"
              >
                WhatsApp isprika
              </a>
            ) : (
              <span className="shrink-0 text-[11px] text-slate-300">nema broja</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export function ReturnedList({ items }: { items: { id: string; createdAt: Date; customerName: string; total: number }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((o) => (
        <li key={o.id} className="flex items-center justify-between text-sm">
          <span className="text-slate-700">
            <span className="text-slate-400">{o.createdAt.toLocaleDateString("hr-HR")}</span> · {formatCroatianName(o.customerName)}
          </span>
          <span className="font-semibold text-red-500">{eur(o.total)}</span>
        </li>
      ))}
    </ul>
  );
}
