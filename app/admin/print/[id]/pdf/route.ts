import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { ShippingLabelDoc } from "@/components/admin/shipping-label-pdf";
import { isAdmin } from "@/lib/admin-auth";
import { codAmount, getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatCroatianName, formatCroatianPhone, repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SENDERS = {
  igor: { name: "Igor Katanić", address: "Dubljevička ulica 91", city: "10040 Zagreb" },
  ivica: { name: "Ivica Karamatić", address: "Katoro 54", city: "52470 Umag" }
} as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return new NextResponse("Not found", { status: 404 });

  const url = new URL(req.url);
  const q = url.searchParams.get("sender");
  const who = q === "ivica" || q === "igor" ? q : order.shippedBy === "ivica" ? "ivica" : "igor";

  const reference = order.reference || getOrderReference(order.createdAt.toISOString());
  const isCod = order.payment?.toLowerCase().includes("pouze") || !order.payment;
  const cod = isCod ? codAmount(order.total, order.shipping, order.promoCode) : 0;

  const recipientName = formatCroatianName(order.customerName);

  const buffer = await renderToBuffer(
    ShippingLabelDoc({
      sender: SENDERS[who],
      recipientName,
      phone: order.phone ? formatCroatianPhone(order.phone) : undefined,
      address: order.address ? repairText(order.address) : undefined,
      cod,
      reference
    })
  );

  // Naziv fajla: "Posiljka - Ime Prezime.pdf" (UTF-8 + ASCII fallback za starije preglednike).
  const fileName = `Posiljka - ${recipientName}.pdf`;
  const asciiName =
    fileName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/"/g, "") || `Posiljka-${reference}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store"
    }
  });
}
