import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { ShippingLabelDoc } from "@/components/admin/shipping-label-pdf";
import { isAdmin } from "@/lib/admin-auth";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getSettingsFresh } from "@/lib/settings";
import { formatCroatianName, formatCroatianPhone, repairText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const SENDERS = (await getSettingsFresh()).senders;
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return new NextResponse("Not found", { status: 404 });


  const url = new URL(req.url);
  const q = url.searchParams.get("sender");
  const who = q === "ivica" || q === "igor" ? q : order.shippedBy === "ivica" ? "ivica" : "igor";

  const reference = order.reference || getOrderReference(order.createdAt.toISOString());
  const isCod = order.payment?.toLowerCase().includes("pouze") || !order.payment;
  // Pouzeće = ONO ŠTO JE KUPAC VIDIO I POTVRDIO NA BLAGAJNI (order.total = roba
  // − popust + dostava, izračunato na serveru). Isto kao gumb "Za paket.hr".
  // Prije se iznos ponovno računao po drugim pravilima (prag 60 € bez provjere
  // gosta, streetwear uvijek bez dostave, roba nakon popusta) pa je naljepnica
  // znala tražiti 7 € manje ili više nego što je kupac vidio.
  const cod = isCod ? Math.max(0, order.total ?? 0) : 0;

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
