import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionLandingPage } from "@/components/site/collection-landing-page";
import {
  getFeaturedCategoryCollections,
  getFeaturedPlayerCollections,
  getJerseyClubBySlug,
  getJerseyClubCollections
} from "@/lib/data/seo-collections";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";

type ClubPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return getJerseyClubCollections().map((collection) => ({
    slug: collection.slug
  }));
}

export function generateMetadata({ params }: ClubPageProps): Metadata {
  const collection = getJerseyClubBySlug(params.slug);

  if (!collection) {
    return buildMetadata({
      title: "Klub nije pronađen",
      description: "Traženi klupski katalog nije dostupan.",
      path: `/dresovi/klub/${params.slug}`
    });
  }

  return buildMetadata({
    title: collection.title,
    description: collection.description,
    path: collection.path,
    keywords: [collection.label.toLowerCase(), "nogometni dresovi", "dresovi"]
  });
}

export default function ClubPage({ params }: ClubPageProps) {
  const collection = getJerseyClubBySlug(params.slug);

  if (!collection) {
    notFound();
  }

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Dresovi", path: "/dresovi" },
    { name: collection.label, path: collection.path }
  ]);
  const itemListSchema = buildItemListSchema(collection.title, collection.path, collection.products);

  return (
    <CollectionLandingPage
      collection={collection}
      breadcrumbItems={[
        { label: "Početna", href: "/" },
        { label: "Dresovi", href: "/dresovi" },
        { label: collection.label }
      ]}
      schemas={[breadcrumbSchema, itemListSchema]}
      linkGroups={[
        {
          title: "Kupuj po kategoriji",
          description: "Brzo preskoči na retro, dječje ili reprezentativne modele iz kataloga.",
          collections: getFeaturedCategoryCollections()
        },
        {
          title: "Povezani igrači",
          description: "Usporedi modele po igračima koji najčešće privlače klik i pretragu.",
          collections: getFeaturedPlayerCollections(6)
        }
      ]}
    />
  );
}
