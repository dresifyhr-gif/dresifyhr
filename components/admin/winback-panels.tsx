import { eur } from "@/components/admin/ui";
import { formatCroatianName } from "@/lib/utils";

// Returned shipments list — shared by Pregled + Za slanje.
export function ReturnedList({ items }: { items: { id: string; createdAt: Date; customerName: string; total: number }[] }) {
  return (
    // Duge liste (npr. 36 otkazanih) ostaju u kartici i scrollaju same,
    // umjesto da razvuku cijelu stranicu.
    <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {items.map((o) => (
        <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate text-slate-700">
            <span className="text-slate-400">{o.createdAt.toLocaleDateString("hr-HR")}</span> · {formatCroatianName(o.customerName)}
          </span>
          <span className="shrink-0 font-semibold text-red-500">{eur(o.total)}</span>
        </li>
      ))}
    </ul>
  );
}
