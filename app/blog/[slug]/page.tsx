import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { blogPosts, getBlogPostBySlug, getBlogReadingTime } from "@/lib/data/blog-posts";
import { getJerseyBySlug } from "@/lib/data/jerseys";
import { getProductBySlug } from "@/lib/data/product-overrides";
import { buildArticleSchema, buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { formatCroatianDate, repairText } from "@/lib/utils";

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug
  }));
}

export function generateMetadata({ params }: BlogPostPageProps): Metadata {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    return buildMetadata({
      title: "Blog članak nije pronađen",
      description: "Traženi članak nije dostupan.",
      path: `/blog/${params.slug}`
    });
  }

  return buildMetadata({
    title: repairText(post.title),
    description: repairText(post.description),
    path: `/blog/${post.slug}`,
    keywords: [repairText(post.title).toLowerCase(), "blog dresovi", "nogometni dresovi"]
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  // Povezani proizvodi — razrješavamo i statičke dresove i custom (streetwear).
  const related = (
    await Promise.all(
      post.relatedSlugs.map(async (slug) => {
        const product = await getProductBySlug(slug, getJerseyBySlug(slug));
        return product ? { slug, klub: product.klub, igrac: product.igrac } : null;
      })
    )
  ).filter((x): x is { slug: string; klub: string; igrac: string } => x !== null);

  const articleSchema = buildArticleSchema(post);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: repairText(post.title), path: `/blog/${post.slug}` }
  ]);

  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell max-w-4xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: "Početna", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: repairText(post.title) }
          ]}
        />

        <article className="border border-white/10 bg-[#111111] p-6 sm:p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.32em] text-white/45">
            Dresify tim • {formatCroatianDate(post.publishedAt)} • {getBlogReadingTime(post)} min čitanja
          </p>
          <h1 className="mt-4 text-5xl uppercase leading-none text-white sm:text-6xl">
            {repairText(post.title)}
          </h1>
          <p className="mt-6 text-base leading-8 text-white/60">{repairText(post.description)}</p>

          <div className="mt-10 space-y-6 text-base leading-8 text-white/80">
            {post.paragraphs.map((paragraph) => (
              <p key={paragraph}>{repairText(paragraph)}</p>
            ))}
          </div>

          <div className="mt-10 border border-white/10 bg-[#0a0a0a] p-6">
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">Povezani proizvodi</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/dres/${item.slug}`}
                  className="border border-white/10 bg-[#111111] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition duration-200 ease-out hover:border-accent hover:text-accent"
                >
                  {repairText(item.klub)} • {repairText(item.igrac)}
                </Link>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
