import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionLandingPage } from "@/components/site/collection-landing-page";
import {
  getFeaturedClubCollections,
  getFeaturedPlayerCollections,
  getJerseyCategoryBySlug,
  getJerseyCategoryCollections
} from "@/lib/data/seo-collections";
import { buildBreadcrumbSchema, buildItemListSchema, buildMetadata } from "@/lib/seo";

type CategoryPageProps = {
  params: {
    slug: string;
  };
};

export async function generateStaticParams() {
  return (await getJerseyCategoryCollections()).map((collection) => ({
    slug: collection.slug
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const collection = await getJerseyCategoryBySlug(params.slug);

  if (!collection) {
    return buildMetadata({
      title: "Kategorija nije pronađena",
      description: "Traženi katalog dresova nije dostupan.",
      path: `/dresovi/kategorija/${params.slug}`
    });
  }

  return buildMetadata({
    title: collection.title,
    description: collection.description,
    path: collection.path,
    keywords: [collection.label.toLowerCase(), "nogometni dresovi", "dresovi hrvatska"]
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const collection = await getJerseyCategoryBySlug(params.slug);

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
          title: "Najtraženiji klubovi",
          description: "Klupske landing stranice koje vode prema modelima s najviše interesa.",
          collections: await getFeaturedClubCollections(8)
        },
        {
          title: "Popularni igrači",
          description: "Otvori igračke landing stranice i usporedi modele po najjačim upitima.",
          collections: await getFeaturedPlayerCollections(6)
        }
      ]}
    />
  );
}
