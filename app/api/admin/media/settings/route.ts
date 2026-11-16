import { NextResponse } from "next/server";

import { requireAction } from "@/lib/admin-auth";
import { zagrebNow } from "@/lib/media";
import { getMediaSettings, runAutopilot } from "@/lib/media-autopilot";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Glavni prekidač Autopilot ON/OFF (+ 1 ili 2 automatske objave dnevno). Samo vlasnik.
export async function PATCH(request: Request) {
  const user = await requireAction("owner");
  if (!user) return NextResponse.json({ ok: false, message: "Samo vlasnik." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const data: { autopilot?: boolean; maxPerDay?: number; updatedBy: string } = { updatedBy: user.username };
  if (typeof body.autopilot === "boolean") data.autopilot = body.autopilot;
  if ([1, 2].includes(Number(body.maxPerDay))) data.maxPerDay = Number(body.maxPerDay);
  await prisma.mediaSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...data }, update: data });

  // Isključivanje: makni iz rasporeda sve što je autopilot zakazao (ništa ne izlazi samo).
  let released = 0;
  if (data.autopilot === false) {
    const r = await prisma.mediaItem.updateMany({
      where: { status: "ZAKAZANO", autopilot: true },
      data: { status: "NOVO", scheduledAt: null, autopilot: false, error: "Autopilot je isključen — nacrt čeka tvoju odluku." }
    });
    released = r.count;
  }
  // Uključivanje: odmah pogledaj današnje nacrte.
  let result = null;
  if (data.autopilot === true) {
    const latest = await prisma.mediaItem.findFirst({ where: { kind: "BRIEF" }, orderBy: { runDate: "desc" }, select: { runDate: true } });
    result = await runAutopilot(latest?.runDate || zagrebNow().date);
  }
  return NextResponse.json({ ok: true, settings: await getMediaSettings(), released, result });
}
