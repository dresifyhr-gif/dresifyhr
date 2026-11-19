/* FLOODLIGHT premium primitivi — vidi /ui-demo i komentar na vrhu app/globals.css.
   Klijentske komponente (Switch, Segmented, Sheet...) imaju "use client" u svojoj datoteci;
   plohe/tipografija/gumbi su server-safe. */

export { Switch, SwitchRow, Segmented, Check, CheckRow } from "./controls";
export type { SwitchProps, SegmentedOption } from "./controls";

export { GlassPanel, GlassCard, InsetGroup, InsetRow, Divider, SectionShell, Eyebrow, Price, eur, eurRange } from "./surfaces";
export type { GlassPanelProps } from "./surfaces";

export { Button, buttonClass, IconButton, Chip, Tag, SizeTile } from "./buttons";
export type { ButtonProps, IconButtonProps, ChipProps } from "./buttons";

export { Sheet, OverlayScrim, Grabber, SHEET_EASE } from "./overlay";
export type { SheetProps } from "./overlay";

export { useScrollLock, lockScroll } from "./scroll-lock";

/** Šum (SVG data-URI, 120 px pločica, 3.5% bijelo). Za inline style; u CSS-u: var(--fl-noise) ili .fl-noise. */
export const NOISE_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .035 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
