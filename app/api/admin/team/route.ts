import { NextResponse } from "next/server";

import { getAdminUser, hashPin, type AdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ROLES: AdminRole[] = ["OWNER", "PARTNER", "STAFF"];

async function requireOwner() {
  const user = await getAdminUser();
  return user && user.role === "OWNER" ? user : null;
}

// Popis svih profila (bez hasheva) — za ekran Postavke → Tim.
export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ ok: false }, { status: 403 });
  const users = await prisma.adminUser.findMany({
    select: { id: true, username: true, role: true, avatar: true, active: true, lastLogin: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ users });
}

// Dodaj novi profil.
export async function POST(request: Request) {
  if (!(await requireOwner())) return NextResponse.json({ ok: false }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role: AdminRole = ROLES.includes(body?.role) ? body.role : "STAFF";
  const avatar = typeof body?.avatar === "string" && body.avatar.trim() ? body.avatar.trim() : null;

  if (!username || !password) {
    return NextResponse.json({ ok: false, message: "Ime i lozinka su obavezni." }, { status: 400 });
  }
  const exists = await prisma.adminUser.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ ok: false, message: "Profil s tim imenom već postoji." }, { status: 409 });

  const user = await prisma.adminUser.create({
    data: { username, pinHash: hashPin(password), role, avatar },
    select: { id: true, username: true, role: true, avatar: true, active: true }
  });
  return NextResponse.json({ ok: true, user });
}

// Uredi profil (ime, uloga, slika, aktivnost, opcionalno nova lozinka).
export async function PATCH(request: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ ok: false }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body?.username === "string" && body.username.trim()) data.username = body.username.trim();
  if (ROLES.includes(body?.role)) data.role = body.role;
  if (typeof body?.avatar === "string") data.avatar = body.avatar.trim() || null;
  if (typeof body?.active === "boolean") data.active = body.active;
  if (typeof body?.password === "string" && body.password) data.pinHash = hashPin(body.password);

  // Sigurnost: ne dopusti da OWNER sam sebi makne OWNER ulogu ili se deaktivira
  // ako je jedini OWNER (da se ne zaključa van sustava).
  if ((data.role && data.role !== "OWNER") || data.active === false) {
    if (id === owner.id) {
      const owners = await prisma.adminUser.count({ where: { role: "OWNER", active: true } });
      if (owners <= 1) {
        return NextResponse.json({ ok: false, message: "Ne možeš maknuti/ugasiti jedinog vlasnika." }, { status: 400 });
      }
    }
  }

  try {
    const user = await prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, avatar: true, active: true }
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false, message: "Greška pri spremanju (možda dupli username)." }, { status: 409 });
  }
}

// Ukloni profil.
export async function DELETE(request: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ ok: false }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  if (id === owner.id) {
    return NextResponse.json({ ok: false, message: "Ne možeš obrisati vlastiti profil." }, { status: 400 });
  }
  await prisma.adminUser.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
