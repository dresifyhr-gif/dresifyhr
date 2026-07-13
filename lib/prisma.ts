import { PrismaClient } from "@prisma/client";

// Single PrismaClient instance (avoids exhausting connections during dev HMR).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Neon pooler default drži premalo konekcija (~num_cpus*2+1 → ~3-5 na serverlessu),
// pa se paralelni upiti (npr. admin dashboard) serijaliziraju. Podignemo limit da
// paralelizacija stvarno radi. Pooler (PgBouncer) lako podnosi više konekcija.
function databaseUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base || /[?&]connection_limit=/.test(base)) return base;
  return base + (base.includes("?") ? "&" : "?") + "connection_limit=15";
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(databaseUrl() ? { datasources: { db: { url: databaseUrl() } } } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
