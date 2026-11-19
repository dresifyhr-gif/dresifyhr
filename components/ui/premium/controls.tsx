"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check as CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Switch — iOS 51×31, bijeli palac 27 px, neonska staza kad je ON.   */
/* ------------------------------------------------------------------ */
export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Pristupačni naziv (obavezan ako nema `labelledBy`). */
  label?: string;
  /** id elementa koji ga imenuje (npr. tekst u SwitchRow). */
  labelledBy?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function Switch({ checked, onCheckedChange, label, labelledBy, disabled, id, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("fl-switch", className)}
    >
      <span className="fl-switch-pos" aria-hidden>
        <span className="fl-switch-knob" />
      </span>
    </button>
  );
}

/** Redak kao u iOS Postavkama: naziv lijevo, prekidač desno. Stavi u <InsetGroup>. */
export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("fl-row min-h-[52px] justify-between py-2", className)}>
      <div className="min-w-0">
        <p id={`${id}-l`} className="text-[15px] font-medium text-white">
          {label}
        </p>
        {description ? <p className="mt-0.5 text-[12.5px] leading-snug text-white/50">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} labelledBy={`${id}-l`} disabled={disabled} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Segmented — iOS segmentirana kontrola, klizni neonski palac.        */
/*  role=radiogroup + strelice lijevo/desno (roving tabindex).          */
/* ------------------------------------------------------------------ */
export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Mala druga linija (npr. "S–XXL"). */
  sub?: ReactNode;
  disabled?: boolean;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  fullWidth = true,
  id,
  className
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Pristupačni naziv grupe, npr. "Veličine". */
  label: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  /** Jedinstveni id za layoutId palca (inače se generira). */
  id?: string;
  className?: string;
}) {
  const auto = useId();
  const groupId = id ?? auto;
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasSub = options.some((o) => o.sub);

  const move = (from: number, dir: 1 | -1) => {
    const n = options.length;
    for (let step = 1; step <= n; step++) {
      const i = (from + dir * step + n) % n;
      if (!options[i].disabled) {
        onChange(options[i].value);
        refs.current[i]?.focus();
        return;
      }
    }
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(i, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(i, -1);
    }
  };

  const h = hasSub
    ? size === "sm"
      ? "min-h-[40px] py-1"
      : "min-h-[48px] py-1.5"
    : size === "sm"
      ? "h-[28px]"
      : size === "lg"
        ? "h-[40px]"
        : "h-[34px]";
  const text = size === "sm" ? "px-3 text-[11px]" : size === "lg" ? "px-5 text-[14px]" : "px-4 text-[13px]";

  return (
    <div role="radiogroup" aria-label={label} className={cn("fl-seg", fullWidth ? "w-full" : "inline-flex", className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative flex-1 whitespace-nowrap rounded-full font-semibold tracking-[0.04em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
              h,
              text,
              active ? "text-[#0a0a0a]" : "text-white/60 hover:text-white/85"
            )}
          >
            {active && (
              <motion.span
                layoutId={`${groupId}-seg-thumb`}
                className="fl-seg-thumb"
                aria-hidden
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex flex-col items-center leading-tight">
              <span>{o.label}</span>
              {o.sub ? (
                <span
                  className={cn(
                    "mt-0.5 text-[10.5px] font-medium tracking-normal",
                    active ? "text-black/60" : "text-white/55"
                  )}
                >
                  {o.sub}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Check — okrugla kvačica 22 px (prazan prsten → neon s crnom ✓).     */
/*  Samo vizual (aria-hidden). Stavi u <label>/<button role=checkbox>.  */
/* ------------------------------------------------------------------ */
export function Check({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span className={cn("fl-check", className)} data-checked={checked} aria-hidden>
      <span className="fl-check-fill">
        <CheckIcon strokeWidth={3} className="h-3 w-3" />
      </span>
    </span>
  );
}

/** Redak s okruglom kvačicom (višestruki odabir: liga, klub, igrač). */
export function CheckRow({
  label,
  checked,
  onCheckedChange,
  trailing,
  className
}: {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Desno, npr. broj dresova. */
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn("fl-row", className)}
    >
      <Check checked={checked} />
      <span className="min-w-0 flex-1 truncate text-[15px] text-white/90">{label}</span>
      {trailing != null ? <span className="fl-tabular text-[13px] text-white/55">{trailing}</span> : null}
    </button>
  );
}
