import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Button — tanki omot oko klasa .button-primary / -secondary / -ghost */
/*  (klase same po sebi rade i bez ove komponente).                     */
/* ------------------------------------------------------------------ */
type Variant = "primary" | "secondary" | "ghost";

export function buttonClass({
  variant = "primary",
  size = "md",
  glint,
  full,
  className
}: {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  /** Odsjaj koji prelazi preko CTA — SAMO 1 gumb po ekranu. */
  glint?: boolean;
  full?: boolean;
  className?: string;
} = {}) {
  return cn(
    variant === "primary" ? "button-primary" : variant === "secondary" ? "button-secondary" : "button-ghost",
    variant !== "ghost" && size === "sm" && "button-sm",
    variant !== "ghost" && size === "lg" && "button-lg",
    variant === "primary" && glint && "button-glint",
    full && "w-full",
    className
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  glint?: boolean;
  full?: boolean;
  /** Ako je zadan, renderira se kao next/link. */
  href?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, glint, full, href, className, type = "button", children, ...rest },
  ref
) {
  const cls = buttonClass({ variant, size, glint, full, className });
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={rest["aria-label"]}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/*  IconButton — okrugli gumb s hairline rubom (36 / 40 / 44 px).        */
/*  Ikone: lucide 18 px, strokeWidth 1.75.                               */
/* ------------------------------------------------------------------ */
export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Pristupačni naziv (obavezno, hrvatski: "Zatvori", "Pretraži"...). */
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "glass" | "plain" | "neon";
  /** Neonska značka s brojem; skrivena kad je 0/undefined. */
  badge?: number;
  href?: string;
  /** Za vanjske poveznice (Instagram, WhatsApp). */
  external?: boolean;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", variant = "glass", badge, href, external, className, type = "button", children, ...rest },
  ref
) {
  const cls = cn(
    "fl-icon-btn",
    size === "sm" && "fl-icon-btn-sm",
    size === "lg" && "fl-icon-btn-lg",
    variant === "plain" && "fl-icon-btn-plain",
    variant === "neon" && "fl-icon-btn-neon",
    className
  );
  const inner = (
    <>
      {children}
      {badge ? (
        <span className="fl-badge" aria-hidden>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </>
  );
  const name = badge ? `${label} (${badge})` : label;
  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className={cls}>
        {inner}
      </a>
    ) : (
      <Link href={href} aria-label={name} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} aria-label={name} className={cls} {...rest}>
      {inner}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/*  Chip — pilula 36 px; odabrano = neon + crni tekst (aria-pressed).    */
/* ------------------------------------------------------------------ */
export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  size?: "sm" | "md";
  /** Neonska točka ispred teksta. */
  dot?: boolean;
};

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected, size = "md", dot, className, type = "button", children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected === undefined ? undefined : selected}
      data-selected={selected ? "true" : undefined}
      className={cn("fl-chip", size === "sm" && "fl-chip-sm", className)}
      {...rest}
    >
      {dot && !selected ? <span className="fl-dot" aria-hidden /> : null}
      {children}
    </button>
  );
});

/** Neinteraktivna oznaka (h 24, 10.5 px, razmak .14em) s neonskom točkom. */
export function Tag({
  children,
  dot = true,
  tone = "glass",
  className
}: {
  children: ReactNode;
  dot?: boolean;
  /** glass = na tamnom · dark = preko svijetle fotografije (Vitrina). */
  tone?: "glass" | "dark";
  className?: string;
}) {
  return (
    <span className={cn("fl-tag", tone === "dark" && "fl-tag-dark", className)}>
      {dot ? <span className="fl-dot" aria-hidden /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SizeTile — pločica veličine (48 px, r12). Rasprodano = precrtano.    */
/* ------------------------------------------------------------------ */
export const SizeTile = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; soldOut?: boolean }
>(function SizeTile({ selected, soldOut, disabled, className, type = "button", children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      {...rest}
      disabled={soldOut || disabled}
      data-selected={selected ? "true" : undefined}
      data-soldout={soldOut ? "true" : undefined}
      className={cn("fl-tile", className)}
    >
      {children}
      {soldOut ? <span className="sr-only"> — rasprodano</span> : null}
    </button>
  );
});
