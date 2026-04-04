import Link from "next/link";

import { SectionHeading } from "@/components/site/section-heading";
import { blogPosts, getBlogReadingTime } from "@/lib/data/blog-posts";
import { formatCroatianDate, repairText } from "@/lib/utils";

export function BlogPreviewSection() {
  return (
    <section className="section-pad bg-[#0a0a0a]">
      <div className="page-shell">
        <SectionHeading
          kicker="Blog"
          title="Savjeti & novosti"
          description="Kratki vodiči, trendovi i inspiracija za izbor dresa, veličine i retro klasika."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group relative overflow-hidden border border-white/10 bg-[#111111] p-6 transition duration-200 ease-out hover:border-accent"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/50">
                <span>{formatCroatianDate(post.publishedAt)}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>{getBlogReadingTime(post)} min čitanja</span>
              </div>
              <h3 className="mt-4 text-3xl uppercase leading-none text-white transition duration-200 ease-out group-hover:text-accent">
                {repairText(post.title)}
              </h3>
              <p className="mt-4 text-sm leading-7 text-white/60">{repairText(post.description)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
