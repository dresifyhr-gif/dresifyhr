import { notFound, redirect } from "next/navigation";

import { AutoPrint } from "@/components/admin/auto-print";
import { LabelSender } from "@/components/admin/label-sender";
import { PdfLabelLink } from "@/components/admin/pdf-label-link";
import { isAdmin } from "@/lib/admin-auth";
import { codAmount, getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatCroatianName, formatCroatianPhone, repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;

export default async function ShippingLabelPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login/");

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) notFound();

  const reference = order.reference || getOrderReference(order.createdAt.toISOString());
  const isCod = order.payment?.toLowerCase().includes("pouze") || !order.payment;
  const cod = isCod ? codAmount(order.total, order.shipping, order.promoCode) : 0;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: 100mm 150mm; margin: 4mm; }
          html, body { background: #fff; }
          .no-print { display: none !important; }
          .label { box-shadow: none !important; margin: 0 !important; border: 2px solid #000 !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[360px] items-center justify-between">
        <a href="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-800">← Nazad</a>
        <div className="flex items-center gap-2">
          <PdfLabelLink id={id} defaultSender={order.shippedBy === "ivica" ? "ivica" : order.shippedBy === "igor" ? "igor" : undefined} />
          <AutoPrint />
        </div>
      </div>

      <div className="label mx-auto w-[360px] rounded-lg border-2 border-black bg-white p-4 text-black shadow-lg">
        {/* Šalje — Igor ili Ivica (različite adrese) */}
        <LabelSender defaultSender={order.shippedBy === "ivica" ? "ivica" : order.shippedBy === "igor" ? "igor" : undefined} />

        <div className="my-3 border-t-2 border-black" />

        {/* Prima */}
        <div className="text-[11px] font-bold uppercase tracking-wider text-black/60">Prima</div>
        <div className="mt-0.5 leading-6">
          <div className="text-[20px] font-bold leading-tight">{formatCroatianName(order.customerName)}</div>
          {order.phone ? <div className="text-[16px] font-semibold">📞 {formatCroatianPhone(order.phone)}</div> : null}
          {order.address ? <div className="text-[17px] font-medium leading-6">{repairText(order.address)}</div> : null}
        </div>

        {/* Otkupnina */}
        {cod > 0 ? (
          <div className="mt-3 flex items-center justify-between rounded border-2 border-black px-3 py-2">
            <span className="text-[13px] font-bold uppercase">Otkupnina</span>
            <span className="text-[24px] font-bold">{eur(cod)}</span>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-[11px] text-black/60">
          <span>#{reference}</span>
          <span>Pouzeće</span>
        </div>
      </div>
    </div>
  );
}
