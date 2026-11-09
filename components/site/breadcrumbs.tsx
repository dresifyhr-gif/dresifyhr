import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase leading-none tracking-[0.14em] text-mute">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="transition duration-200 ease-out hover:text-accent">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-black text-fg" : undefined}>{item.label}</span>
              )}
              {!isLast ? <span className="text-white/20">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
