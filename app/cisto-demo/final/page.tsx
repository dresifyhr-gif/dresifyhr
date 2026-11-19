import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { noviHome } from "@/components/novi/home";

// DEMO FINAL (integracija): ista naslovnica kao prava "/" u buildu s novim dizajnom; chrome dolazi
// iz layouta. Bez zastavice NEXT_PUBLIC_NOVI_DIZAJN=1 → 404 (produkcijski build ne nosi novi kod).
export const metadata: Metadata = { title: "Čisto — final", robots: { index: false, follow: false } };
export const revalidate = 120;

export default async function CistoDemoFinal() {
  if (!noviHome) notFound();
  return <noviHome.Home />;
}
