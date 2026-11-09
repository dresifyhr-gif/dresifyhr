import Link from "next/link";

import type { JerseyCollection } from "@/lib/data/seo-collections";

type SeoLinkGridProps = {
  title: string;
  description: string;
  collections: JerseyCollection[];
};

export function SeoLinkGrid({ title, description, collections }: SeoLinkGridProps) {
  return (
    <div className="border-t border-white/10 pt-5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-mute">{title}</p>
      <p className="mt-2 text-[13px] leading-[1.5] text-[#c4c4bd]">{description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {collections.map((collection) => (
          <Link
            key={collection.path}
            href={collection.path}
            className="rounded-full border border-white/[0.18] px-3.5 py-2 text-[12px] font-bold text-fg transition-colors duration-200 ease-out hover:border-accent hover:text-accent"
          >
            {collection.label}
            <span className="ml-1.5 text-mute">{collection.products.length}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
