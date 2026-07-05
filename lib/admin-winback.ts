import "server-only";

import { prisma } from "@/lib/prisma";
import { formatCroatianName, repairText } from "@/lib/utils";
import { waLinkText } from "@/components/admin/ui";

const DAY = 86_400_000;
const OLD_DAYS = 14; // narudžbe starije od ovoliko dana koje još nisu poslane

export const OLD_UNSHIPPED_DAYS = OLD_DAYS;

function apologyMessage(name: string, product: string) {
  return `Pozdrav ${name} 👋\n\nJavljamo se iz Dresify shopa. Iskreno se ispričavamo — zbog velike gužve na početku nažalost nismo uspjeli poslati tvoju narudžbu (${product}).\n\nAko si i dalje zainteresiran/a, rado ćemo ti je poslati odmah. Samo nam javi! 🙏`;
}

export type OldUnshippedRow = {
  id: string;
  name: string;
  dateLabel: string;
  total: number;
  product: string;
  wa: string | null;
};

// Orders older than OLD_DAYS still unsent — for the WhatsApp apology / win-back list.
export async function getOldUnshipped(limit = 100): Promise<OldUnshippedRow[]> {
  const rows = await prisma.order.findMany({
    where: { status: "new", createdAt: { lt: new Date(Date.now() - OLD_DAYS * DAY) } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      customerName: true,
      phone: true,
      total: true,
      items: { select: { klub: true, igrac: true }, take: 3 }
    }
  });

  return rows.map((o) => {
    const name = formatCroatianName(o.customerName);
    const products = o.items.map((it) => repairText([it.klub, String(it.igrac || "").split("—")[0].trim()].filter(Boolean).join(" ")));
    const product = products.slice(0, 2).join(", ") + (o.items.length > 2 ? " i još…" : "");
    return {
      id: o.id,
      name,
      dateLabel: o.createdAt.toLocaleDateString("hr-HR"),
      total: o.total,
      product: product || "dres",
      wa: waLinkText(o.phone, apologyMessage(name, product || "dres"))
    };
  });
}
