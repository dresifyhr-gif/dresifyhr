import { notFound } from "next/navigation";

// /cisto-demo/* su interni duplikati (naslovnica, košarica, blagajna, dres) za razvoj novog dizajna.
// Na produkciji (Vercel production) → 404, da nakon puštanja ne budu javno dostupni.
// Lokalni dev i preview deployi ih i dalje imaju. Ukloniti cijelu mapu nakon puštanja.
export default function CistoDemoLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  return children;
}
