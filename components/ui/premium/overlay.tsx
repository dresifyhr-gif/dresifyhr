"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconButton } from "./buttons";
import { useScrollLock } from "./scroll-lock";

/* ------------------------------------------------------------------ */
/*  Zajednički sloj: matirani zaslon (PRAVI blur — stranica iza miruje)  */
/*  + list/ladica od lažnog stakla (BEZ drugog blura).                    */
/*  z-index: zaslon 130, panel 131 (iznad zaglavlja, donje navigacije,    */
/*  chata i postojećih prozora). Mijenja se propom `zIndex`.              */
/* ------------------------------------------------------------------ */

export const SHEET_EASE = [0.32, 0.72, 0, 1] as const;

function usePortalReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

/** Samo matirani zaslon (fade 200 ms in / 160 ms out). Klik = onClose. Portal u <body>. */
export function OverlayScrim({
  open,
  onClose,
  zIndex = 130,
  className
}: {
  open: boolean;
  onClose?: () => void;
  zIndex?: number;
  className?: string;
}) {
  const ready = usePortalReady();
  if (!ready) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="fl-scrim"
          aria-hidden
          onClick={onClose}
          className={cn("overlay-scrim touch-none", className)}
          style={{ zIndex }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeIn" } }}
        />
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Pristupačni naziv dijaloga (ako nema `title`). */
  label: string;
  /** "bottom" = list odozdo (mobitel) · "right" = ladica s desna (košarica) ·
   *  "auto" = odozdo na mobitelu, s desna od md (768px) naviše. */
  side?: "bottom" | "right" | "auto";
  /** Naslov u zaglavlju lista (s gumbom X). Bez njega: crtaš svoje zaglavlje. */
  title?: ReactNode;
  /** Desno od naslova, prije X (npr. "Poništi sve"). */
  headerAction?: ReactNode;
  /** Ljepljivo podnožje (npr. "Prikaži 42 dresa"), s blagim neonskim sjajem ispod CTA. */
  footer?: ReactNode;
  /** Ručkica za povlačenje (zadano: da za bottom). Povuci dolje > 100 px = zatvori. */
  grabber?: boolean;
  /** Visina lista odozdo (zadano 88vh). */
  maxHeight?: string;
  /** Panel ostaje u DOM-u kad je zatvoren (bez skoka pri prvom otvaranju). Zadano: true. */
  keepMounted?: boolean;
  zIndex?: number;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function Sheet({
  open,
  onClose,
  label,
  side = "bottom",
  title,
  headerAction,
  footer,
  grabber,
  maxHeight = "88vh",
  keepMounted = true,
  zIndex = 130,
  className,
  bodyClassName,
  children
}: SheetProps) {
  const ready = usePortalReady();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const drag = useDragControls();
  const titleId = `${useId()}-title`;
  const [visible, setVisible] = useState(open);
  const [isDesktop, setIsDesktop] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    if (side !== "auto") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const set = () => setIsDesktop(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, [side]);

  const resolved: "bottom" | "right" = side === "auto" ? (isDesktop ? "right" : "bottom") : side;
  const showGrabber = grabber ?? resolved === "bottom";

  // Otvaranje: zapamti fokus, fokusiraj panel. Zatvaranje: vrati fokus.
  useEffect(() => {
    if (open) {
      setVisible(true);
      restoreRef.current = document.activeElement as HTMLElement | null;
      const id = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(id);
    }
    const el = restoreRef.current;
    if (el && typeof el.focus === "function") el.focus({ preventScroll: true });
  }, [open]);

  // Escape + zarobljeni Tab unutar panela.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // `inert` dok je zatvoren (React 18 ga ne poznaje kao prop).
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [open, ready, resolved]);

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 600) onClose();
    },
    [onClose]
  );

  if (!ready) return null;
  if (!keepMounted && !open && !visible) return null;

  const hidden = resolved === "bottom" ? { y: "100%", x: 0 } : { x: "100%", y: 0 };
  const shown = { x: 0, y: 0 };
  const tIn = reduce ? { duration: 0.12 } : { duration: 0.38, ease: SHEET_EASE };
  const tOut = reduce ? { duration: 0.12 } : { duration: 0.24, ease: [0.4, 0, 1, 1] as const };

  const panel = (
    <motion.div
      key={`fl-sheet-${resolved}`}
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? undefined : label}
      aria-labelledby={typeof title === "string" ? titleId : undefined}
      aria-hidden={!open}
      tabIndex={-1}
      initial={hidden}
      animate={open ? { ...shown, opacity: 1, transition: tIn } : { ...hidden, transition: tOut }}
      onAnimationComplete={() => {
        if (!open) setVisible(false);
      }}
      drag={resolved === "bottom" && showGrabber && !reduce ? "y" : false}
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.9 }}
      onDragEnd={onDragEnd}
      style={{
        zIndex: zIndex + 1,
        visibility: open || visible ? "visible" : "hidden",
        maxHeight: resolved === "bottom" ? maxHeight : undefined
      }}
      className={cn(
        "fl-sheet fixed flex flex-col",
        resolved === "bottom"
          ? "fl-rim inset-x-0 bottom-0 mx-auto w-full max-w-[560px] rounded-t-[24px] pb-[env(safe-area-inset-bottom)]"
          : "fl-sheet-right bottom-0 right-0 top-0 w-[min(420px,92vw)] rounded-l-[24px] md:rounded-l-none",
        className
      )}
    >
      {showGrabber ? (
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing"
          onPointerDown={(e) => drag.start(e)}
          aria-hidden
        >
          <span className="fl-grabber" />
        </div>
      ) : null}
      {title != null ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-3 px-5",
            showGrabber ? "pb-3 pt-1" : "pb-3 pt-[max(16px,env(safe-area-inset-top))]"
          )}
          onPointerDown={showGrabber ? (e) => {
            if ((e.target as Element).closest("button,a")) return;
            drag.start(e);
          } : undefined}
        >
          <h2
            id={typeof title === "string" ? titleId : undefined}
            className="min-w-0 flex-1 truncate font-heading text-[26px] uppercase leading-none tracking-[0.04em] text-white"
          >
            {title}
          </h2>
          {headerAction}
          <IconButton label="Zatvori" size="sm" onClick={onClose}>
            <X strokeWidth={1.75} className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      ) : null}
      <div className={cn("fl-sheet-body fl-noscroll", footer && "fl-fade-b pb-6", bodyClassName)}>{children}</div>
      {footer ? (
        <div className="relative shrink-0 px-5 pb-4 pt-3">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-8 bottom-0 h-16 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(232,255,60,0.10),transparent_70%)]"
          />
          <div className="relative">{footer}</div>
        </div>
      ) : null}
    </motion.div>
  );

  return (
    <>
      <OverlayScrim open={open} onClose={onClose} zIndex={zIndex} />
      {createPortal(panel, document.body)}
    </>
  );
}

/** Samostalna ručkica (ako crtaš svoj list). */
export function Grabber({ className }: { className?: string }) {
  return <div aria-hidden className={cn("fl-grabber mx-auto mt-2.5 shrink-0", className)} />;
}
