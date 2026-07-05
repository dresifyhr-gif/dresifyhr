import { eur } from "@/components/admin/ui";
import { formatCroatianName } from "@/lib/utils";

// Returned shipments list — shared by Pregled + Za slanje.
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
