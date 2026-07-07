// Zvjezdice za ocjenu (0–5, s pola). Prikaz recenzija.
export function Stars({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const px = size === "md" ? 18 : 14;
  const full = Math.floor(value);
  const half = value - full >= 0.25 && value - full < 0.75;
  const roundedUp = value - full >= 0.75;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full || (i === full && roundedUp)) return "full";
    if (i === full && half) return "half";
    return "empty";
  });

  return (
    <span className="inline-flex items-center gap-1" aria-label={`Ocjena ${value.toFixed(1)} od 5`}>
      <span className="inline-flex">
        {stars.map((s, i) => (
          <svg key={i} width={px} height={px} viewBox="0 0 24 24" className="shrink-0">
            <defs>
              <linearGradient id={`half-${i}-${px}`}>
                <stop offset="50%" stopColor="#f5b301" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.18)" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 17.8 6.1 20.4l1.2-6.6L2.5 9l6.6-.9z"
              fill={s === "full" ? "#f5b301" : s === "half" ? `url(#half-${i}-${px})` : "rgba(255,255,255,0.18)"}
            />
          </svg>
        ))}
      </span>
      <span className={`font-semibold ${size === "md" ? "text-sm text-white" : "text-[11px] text-white/70"}`}>{value.toFixed(1)}</span>
      {count != null && <span className={`${size === "md" ? "text-sm text-white/50" : "text-[11px] text-white/40"}`}>({count})</span>}
    </span>
  );
}
