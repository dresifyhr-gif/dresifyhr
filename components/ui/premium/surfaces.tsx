import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Plohe (lažno staklo, BEZ backdrop-filtera) — server-safe.            */
/*   level 1: paneli, grupe filtera, kartice na tamnom                   */
/*   level 2: listovi, ladica, prozori, trake (sa šumom)                 */
/*   level 3: podignute kontrole unutar panela                           */
/* ------------------------------------------------------------------ */

const LEVEL = { 1: "fl-glass-1", 2: "fl-glass-2", 3: "fl-glass-3" } as const;
const RADIUS = {
  sm: "rounded-[12px]",
  md: "rounded-[14px]",
  lg: "rounded-[20px]",
  xl: "rounded-[24px]",
  none: ""
} as const;

export type GlassPanelProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  level?: 1 | 2 | 3;
  /** sm 12 · md 14 · lg 20 · xl 24 (zadano: lg) */
  radius?: keyof typeof RADIUS;
  /** Neonski gornji odsjaj ("ključna" ploha — štedljivo, ~6 po ekranu). */
  keyLight?: boolean;
  /** Neonska linija na gornjem rubu koja blijedi prema stranama. */
  rim?: boolean;
  /** Dodatni sloj šuma (level 2 ga već ima). */
  noise?: boolean;
  /** Mali neonski reflektor u gornjem desnom kutu (npr. sažetak košarice). */
  flood?: boolean;
  children?: ReactNode;
};

export function GlassPanel({
  as: Tag = "div",
  level = 1,
  radius = "lg",
  keyLight,
  rim,
  noise,
  flood,
  className,
  children,
  ...rest
}: GlassPanelProps) {
  return (
    <Tag
      className={cn(
        "relative",
        LEVEL[level],
        RADIUS[radius],
        keyLight && "fl-key",
        rim && "fl-rim",
        noise && "fl-noise-overlay",
        className
      )}
      {...rest}
    >
      {flood ? <span aria-hidden className="fl-flood-corner pointer-events-none absolute inset-0 rounded-[inherit]" /> : null}
      {flood ? <div className="relative">{children}</div> : children}
    </Tag>
  );
}

/** Kartica na tamnom: L1, radijus 14, opcionalno interaktivna (rub se upali na hover, pritisak). */
export function GlassCard({
  interactive,
  className,
  ...rest
}: Omit<GlassPanelProps, "level" | "radius"> & { interactive?: boolean }) {
  return (
    <GlassPanel
      level={1}
      radius="md"
      className={cn(interactive && "fl-hoverable fl-press", className)}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  iOS grupirani popis: jedna L1 grupa, redovi 44 px, hairline uvučen 16. */
/* ------------------------------------------------------------------ */
export function InsetGroup({
  title,
  footer,
  className,
  children,
  as: Tag = "div",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: ElementType; title?: ReactNode; footer?: ReactNode }) {
  return (
    <div className={className}>
      {title ? (
        <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">{title}</p>
      ) : null}
      <Tag className="fl-group" {...rest}>
        {children}
      </Tag>
      {footer ? <p className="mt-2 px-4 text-[12px] leading-snug text-white/45">{footer}</p> : null}
    </div>
  );
}

/** Statični redak u InsetGroup (za interaktivni koristi <button className="fl-row">). */
export function InsetRow({
  className,
  children,
  as: Tag = "div",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: ElementType }) {
  return (
    <Tag className={cn("fl-row", className)} {...rest}>
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/*  Divider — gradijentna hairline (blijedi prema rubovima).             */
/* ------------------------------------------------------------------ */
export function Divider({
  neon,
  vertical,
  className
}: {
  /** Neonska varijanta (rub zaglavlja, iznad ključne sekcije). */
  neon?: boolean;
  vertical?: boolean;
  className?: string;
}) {
  if (vertical) return <span aria-hidden className={cn("fl-hairline-v", className)} />;
  return <div aria-hidden className={cn(neon ? "fl-hairline-neon" : "fl-hairline", "w-full", className)} />;
}

/* ------------------------------------------------------------------ */
/*  SectionShell — jedna crna (#0a0a0a) + ritam razmaka 56/88.          */
/* ------------------------------------------------------------------ */
export function SectionShell({
  as: Tag = "section",
  pad = "default",
  flood,
  divider,
  container = true,
  className,
  innerClassName,
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  /** default 56/88 · tight 40/56 · none */
  pad?: "default" | "tight" | "none";
  /** Statični neonski "reflektor" iza naslova sekcije. */
  flood?: boolean | "wide";
  /** Gradijentna hairline na vrhu sekcije (umjesto promjene boje pozadine). */
  divider?: boolean;
  /** Omotaj sadržaj u .page-shell (zadano: da). */
  container?: boolean;
  innerClassName?: string;
}) {
  return (
    <Tag
      className={cn(
        "fl-section",
        pad === "tight" && "fl-section-tight",
        pad === "none" && "fl-section-flush",
        flood === "wide" ? "fl-flood-wide" : flood ? "fl-flood" : null,
        className
      )}
      {...rest}
    >
      {divider ? <div aria-hidden className="fl-hairline absolute inset-x-0 top-0" /> : null}
      {container ? <div className={cn("page-shell", innerClassName)}>{children}</div> : children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/*  Tipografija                                                         */
/* ------------------------------------------------------------------ */

/** Nadnaslov: 11 px, razmak .22em, neon 85% s točkom (bez kutije). */
export function Eyebrow({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return (
    <Tag className={cn("fl-eyebrow", className)}>
      <span className="fl-dot" aria-hidden />
      {children}
    </Tag>
  );
}

/** Cijena "20 €" (nbsp). Cijeli brojevi bez decimala, inače "19,90 €". */
export function eur(n: number): string {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
  return `${s} €`;
}

/** Raspon "30–40 €" (en-crtica, nbsp). */
export function eurRange(min: number, max: number): string {
  if (min === max) return eur(min);
  const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
  return `${f(min)}–${f(max)} €`;
}

/** Neonska cijena u heading fontu. size: sm 20 · md 28 · lg 36 px. Uvijek prave cijene iz podataka. */
export function Price({
  value,
  size = "md",
  glow,
  compareAt,
  className
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  /** Stara cijena (precrtana) — SAMO ako stvarno postoji u podacima. */
  compareAt?: number;
  className?: string;
}) {
  const px = size === "sm" ? "text-[20px]" : size === "lg" ? "text-[36px]" : "text-[28px]";
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("fl-price", px, glow && "fl-price-glow")}>{eur(value)}</span>
      {compareAt != null && compareAt > value ? (
        <s className="fl-tabular text-[13px] text-white/40">{eur(compareAt)}</s>
      ) : null}
    </span>
  );
}
