import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // uvijek svježe iz baze (bez build-time keša)

// Javna lista profila SAMO za login-kartice: username + slika. Bez uloga/hasheva.
// Ako nema nijednog profila → login pada na staru zajedničku lozinku (bootstrap).
export async function GET() {
  const users = await prisma.adminUser
    .findMany({
      where: { active: true },
      select: { username: true, avatar: true },
      orderBy: { createdAt: "asc" }
    })
    .catch(() => []);
  return NextResponse.json({ profiles: users });
}
