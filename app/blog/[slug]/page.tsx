import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { blogPosts, getBlogPostBySlug, getBlogReadingTime } from "@/lib/data/blog-posts";
import { getJerseyBySlug } from "@/lib/data/jerseys";
import { getProductBySlug } from "@/lib/data/product-overrides";
import { getCollectionsForBlogPost } from "@/lib/data/seo-collections";
import { buildArticleSchema, buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { formatCroatianDate, repairText } from "@/lib/utils";

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

// [tekst](/putanja/) u tekstu članka → interni <Link>. Sve ostalo ostaje običan tekst.
const INLINE_LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/;

function RichText({ text }: { text: string }) {
  const source = repairText(text);
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(INLINE_LINK.source, "g");
  while ((match = re.exec(source)) !== null) {
    if (match.index > last) nodes.push(source.slice(last, match.index));
    nodes.push(
      <Link
        key={`${match.index}-${match[2]}`}
        href={match[2]}
        className="font-semibold text-white underline decoration-accent/60 underline-offset-4 transition hover:text-accent"
      >
        {match[1]}
      </Link>
    );
    last = match.index + match[0].length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return <>{nodes}</>;
}

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

  // Landinzi (klub / igrač / kategorija) koji ovaj članak navode u relatedPosts.
  const landings = await getCollectionsForBlogPost(post.slug);

  const articleSchema = buildArticleSchema(post);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: repairText(post.title), path: `/blog/${post.slug}` }
  ]);

  const updated = post.updatedAt && post.updatedAt !== post.publishedAt ? post.updatedAt : null;

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
          {updated ? (
            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-white/45">
              Ažurirano: <time dateTime={updated}>{formatCroatianDate(updated)}</time>
            </p>
          ) : null}
          <h1 className="mt-4 text-5xl uppercase leading-none text-white sm:text-6xl">
            {repairText(post.title)}
          </h1>
          <p className="mt-6 text-base leading-8 text-white/60">{repairText(post.description)}</p>

          <div className="mt-10 space-y-6 text-base leading-8 text-white/80">
            {post.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}
          </div>

          {post.sections?.map((section) => (
            <section key={section.h2} className="mt-10">
              <h2 className="font-heading text-3xl uppercase leading-tight text-white sm:text-4xl">
                {repairText(section.h2)}
              </h2>
              {section.paragraphs?.length ? (
                <div className="mt-4 space-y-5 text-base leading-8 text-white/80">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>
                      <RichText text={paragraph} />
                    </p>
                  ))}
                </div>
              ) : null}
              {section.list?.length ? (
                <ul className="mt-4 space-y-2 border-l-2 border-accent/60 pl-5 text-base leading-7 text-white/80">
                  {section.list.map((item) => (
                    <li key={item}>
                      <RichText text={item} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.subsections?.map((sub) => (
                <div key={sub.h3} className="mt-6">
                  <h3 className="text-lg font-semibold text-white sm:text-xl">{repairText(sub.h3)}</h3>
                  <div className="mt-2 space-y-4 text-base leading-8 text-white/80">
                    {sub.paragraphs.map((paragraph) => (
                      <p key={paragraph}>
                        <RichText text={paragraph} />
                      </p>
                    ))}
                  </div>
                  {sub.list?.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-base leading-7 text-white/80">
                      {sub.list.map((item) => (
                        <li key={item}>
                          <RichText text={item} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </section>
          ))}

          {post.faq?.length ? (
            <section className="mt-12 border-t border-white/10 pt-10">
              <h2 className="font-heading text-3xl uppercase leading-tight text-white sm:text-4xl">Česta pitanja</h2>
              <div className="mt-6 space-y-6">
                {post.faq.map((item) => (
                  <div key={item.q}>
                    <h3 className="text-lg font-semibold text-white">{repairText(item.q)}</h3>
                    <p className="mt-2 text-base leading-7 text-white/70">
                      <RichText text={item.a} />
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {landings.length ? (
            <div className="mt-10 border border-white/10 bg-[#0a0a0a] p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-white/45">Pogledaj dresove</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {landings.map((collection) => (
                  <Link
                    key={collection.path}
                    href={`${collection.path}/`}
                    className="border border-accent/60 bg-[#111111] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition duration-200 ease-out hover:border-accent hover:text-accent"
                  >
                    {repairText(collection.heading)}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {related.length ? (
            <div className="mt-10 border border-white/10 bg-[#0a0a0a] p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-white/45">Povezani proizvodi</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/dres/${item.slug}/`}
                    className="border border-white/10 bg-[#111111] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition duration-200 ease-out hover:border-accent hover:text-accent"
                  >
                    {repairText(item.klub)} • {repairText(item.igrac)}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
