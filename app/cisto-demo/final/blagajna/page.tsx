import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { noviCheckout } from "@/components/novi/checkout";

// DEMO FINAL (integracija): ista blagajna kao prava /checkout u buildu s novim dizajnom. Bez zastavice → 404.
export const metadata: Metadata = { title: "Čisto — final · blagajna", robots: { index: false, follow: false } };

export default function FinalCheckoutPage() {
  if (!noviCheckout) notFound();
  return <noviCheckout.Checkout />;
}
