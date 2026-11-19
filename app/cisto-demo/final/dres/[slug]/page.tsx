import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { noviProduct } from "@/components/novi/product";
import { getJerseyBySlug } from "@/lib/data/jerseys";
import { getProductBySlug } from "@/lib/data/product-overrides";
import { getServerTranslations } from "@/lib/get-server-translations";

// DEMO FINAL (integracija): ista stranica dresa kao prava /dres/[slug] u buildu s novim dizajnom
// (bez JSON-LD-a — demo je noindex). Bez zastavice → 404.
export const metadata: Metadata = { title: "Čisto — final · dres", robots: { index: false, follow: false } };
export const revalidate = 60;

export default async function FinalProductPage({ params }: { params: { slug: string } }) {
  if (!noviProduct) notFound();
  const { locale } = await getServerTranslations();
  const product = await getProductBySlug(params.slug, getJerseyBySlug(params.slug));
  if (!product) notFound();
  return <noviProduct.Product product={product} locale={locale} breadcrumbs={[]} explore={[]} />;
}
