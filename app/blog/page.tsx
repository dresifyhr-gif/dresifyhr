import Link from "next/link";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SectionHeading } from "@/components/site/section-heading";
import { blogPosts, getBlogReadingTime } from "@/lib/data/blog-posts";
import { buildBreadcrumbSchema, buildMetadata } from "@/lib/seo";
import { formatCroatianDate, repairText } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Blog, savjeti i novosti",
  description:
    "Pročitaj vodiče za veličine, trendove najtraženijih dresova i preporuke za retro modele u DRESIFY blogu.",
  path: "/blog",
  keywords: ["blog dresovi", "veličina dresa", "retro dresovi", "nogometni savjeti"]
});

export default function BlogPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Početna", path: "/" },
    { name: "Blog", path: "/blog" }
  ]);

  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: "Početna", href: "/" },
            { label: "Blog" }
          ]}
        />

        <SectionHeading
          kicker="Blog"
          title="Savjeti i novosti"
          description="Praktični članci za kupnju, veličine i odabir dresa koji će stvarno završiti u rotaciji."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group relative overflow-hidden border border-white/10 bg-[#111111] p-6 transition duration-200 ease-out hover:border-accent"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
              <p className="text-xs uppercase tracking-[0.32em] text-white/50">
                {formatCroatianDate(post.publishedAt)} • {getBlogReadingTime(post)} min čitanja
              </p>
              <h2 className="mt-4 text-4xl uppercase leading-none text-white transition duration-200 ease-out group-hover:text-accent">
                {repairText(post.title)}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/60">{repairText(post.description)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
