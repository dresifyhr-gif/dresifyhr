import { notFound, redirect } from "next/navigation";

import { AutoPrint } from "@/components/admin/auto-print";
import { isAdmin } from "@/lib/admin-auth";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login/");

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true }
  });
  if (!order) notFound();

  const reference = order.reference || getOrderReference(order.createdAt.toISOString());
  const created = order.createdAt.toLocaleString("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const cod = order.payment?.toLowerCase().includes("pouze") || !order.payment ? order.total : 0;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          html, body { background: #fff; }
          .no-print { display: none !important; }
          .slip { box-shadow: none !important; margin: 0 !important; width: auto !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[320px] items-center justify-between">
        <a href="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-800">← Nazad</a>
        <AutoPrint />
      </div>

      <div className="slip mx-auto w-[320px] rounded-lg bg-white p-5 font-mono text-[13px] leading-5 text-black shadow-lg">
        <div className="text-center">
          <div className="text-lg font-bold tracking-widest">DRESIFY</div>
          <div className="text-[11px] text-black/60">dresifyshop.com</div>
        </div>

        <div className="my-3 border-t border-dashed border-black/30" />

        <div className="flex justify-between">
          <span className="font-bold">#{reference}</span>
          <span>{created}</span>
        </div>

        <div className="my-3 border-t border-dashed border-black/30" />

        <div className="space-y-0.5">
          <div className="text-[11px] uppercase text-black/50">Primatelj</div>
          <div className="text-[15px] font-bold">{repairText(order.customerName)}</div>
          {order.phone ? <div>📞 {order.phone}</div> : null}
          {order.address ? <div className="whitespace-pre-wrap">{repairText(order.address)}</div> : null}
        </div>

        <div className="my-3 border-t border-dashed border-black/30" />

        <div className="space-y-1">
          <div className="text-[11px] uppercase text-black/50">Artikli ({order.itemCount})</div>
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between gap-2">
              <span className="min-w-0">
                {it.quantity > 1 ? `${it.quantity}× ` : ""}
                {repairText([it.klub, it.igrac].filter(Boolean).join(" "))}
                {it.size ? <span className="text-black/60"> · vel. {it.size}</span> : null}
              </span>
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-black/30" />

        <div className="space-y-0.5">
          <div className="flex justify-between"><span>Roba</span><span>{eur(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Dostava</span><span>{order.shipping === 0 ? "BESPLATNA" : eur(order.shipping)}</span></div>
          {order.discount > 0 ? <div className="flex justify-between"><span>Popust{order.promoCode ? ` (${order.promoCode})` : ""}</span><span>-{eur(order.discount)}</span></div> : null}
          <div className="mt-1 flex justify-between border-t border-black/40 pt-1 text-[15px] font-bold">
            <span>UKUPNO</span><span>{eur(order.total)}</span>
          </div>
        </div>

        {cod > 0 ? (
          <div className="mt-3 rounded border-2 border-black p-2 text-center">
            <div className="text-[11px] uppercase">Naplatiti pouzećem</div>
            <div className="text-[20px] font-bold">{eur(cod)}</div>
          </div>
        ) : null}

        {order.note ? (
          <div className="mt-3">
            <div className="text-[11px] uppercase text-black/50">Napomena</div>
            <div className="whitespace-pre-wrap">{repairText(order.note)}</div>
          </div>
        ) : null}

        <div className="mt-4 text-center text-[11px] text-black/50">Hvala na narudžbi! 🎉</div>
      </div>
    </div>
  );
}
