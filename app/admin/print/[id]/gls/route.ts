import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { GlsLabelDoc } from "@/components/admin/gls-label-pdf";
import { isAdmin } from "@/lib/admin-auth";
import { getOrderReference } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { INSTAGRAM_URL } from "@/lib/site";
import { formatCroatianName } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GLS naljepnica (100×150, isti MarkLife pisač kao i adresna).
// Adresu i barkod kod GLS-a radi njihov sustav — ovo je samo oznaka za pakiranje
// (ime kupca) + branding koji kupac vidi na paketu.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, customerName: true, createdAt: true, reference: true }
  });
  if (!order) return new NextResponse("Not found", { status: 404 });

  const reference = order.reference || getOrderReference(order.createdAt.toISOString());

  // QR se generira lokalno i ugrađuje kao data URL — bez vanjskih poziva iz PDF-a.
  const qrDataUrl = await QRCode.toDataURL(INSTAGRAM_URL, {
    margin: 1,
    scale: 8,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" }
  });

  const buffer = await renderToBuffer(
    GlsLabelDoc({
      recipientName: formatCroatianName(order.customerName),
      reference,
      qrDataUrl,
      instagramHandle: "@dresify.hr"
    })
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dresify-gls-${reference}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
