import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { noviCart } from "@/components/novi/cart";

// DEMO FINAL (integracija): ista košarica kao prava /kosarica u buildu s novim dizajnom. Bez zastavice → 404.
export const metadata: Metadata = { title: "Čisto — final · košarica", robots: { index: false, follow: false } };

export default function FinalCartPage() {
  if (!noviCart) notFound();
  return <noviCart.Cart />;
}
