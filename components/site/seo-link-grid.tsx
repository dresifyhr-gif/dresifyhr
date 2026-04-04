import Link from "next/link";

import type { JerseyCollection } from "@/lib/data/seo-collections";

type SeoLinkGridProps = {
  title: string;
  description: string;
  collections: JerseyCollection[];
};

export function SeoLinkGrid({ title, description, collections }: SeoLinkGridProps) {
  return (
    <div className="border border-white/10 bg-[#111111] p-6">
      <p className="text-xs uppercase tracking-[0.32em] text-white/50">{title}</p>
      <p className="mt-4 text-sm leading-7 text-white/60">{description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {collections.map((collection) => (
          <Link
            key={collection.path}
            href={collection.path}
            className="border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm font-semibold text-white transition duration-200 ease-out hover:border-accent hover:text-accent"
          >
            {collection.label}
            <span className="ml-2 text-white/45">{collection.products.length}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
