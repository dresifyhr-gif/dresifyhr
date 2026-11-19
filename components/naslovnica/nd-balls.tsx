// Lopte koje prodajemo (lopta kluba iz "Složi svoj mix" / kompleta) i kromirani
// stalak za njih. Lopta je studijska HD fotografija (public/naslovnica/lopte-hd/<klub>.webp,
// izrez točno po rubu lopte) u kružnom izrezu; okreće se (kotrljanje), a preko nje stoji
// nepomično blago sjenčanje sfere (tamni rub dolje-desno + odsjaj gore-lijevo) kao u
// Penalty igri (components/game/v2/penalty/scene.ts → drawBall) — slabije, jer HD
// fotografija već ima vlastito studijsko sjenčanje.
import Image from "next/image";

import { MIX_CLUBS } from "@/lib/mix";

export type ClubKey = (typeof MIX_CLUBS)[number]["key"];

export const clubLabel = (key: string) => MIX_CLUBS.find((c) => c.key === key)?.label ?? key;

/** HD fotografija lopte (izrez po rubu lopte). */
export const ballHdSrc = (club: string) => `/naslovnica/lopte-hd/${club}.webp`;

/** Lopte na stalku (lijevo → desno). Na mobitelu prve 4, na desktopu 5. */
export const RACK_BALLS: ClubKey[] = ["hrvatska", "barcelona", "real-madrid", "portugal", "bayern"];

/* Sjenčanje sfere — iste točke gradijenata kao drawBall (r = 50 u viewBoxu), slabije jer
   HD fotografija već ima studijski rub. */
export function GameBallShade({ id }: { id: string }) {
  return (
    <svg viewBox="-50 -50 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}-s`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="52.5" fx="-15" fy="-17.5" fr="7.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".7" stopColor="#000" stopOpacity=".03" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </radialGradient>
        <radialGradient id={`${id}-h`} gradientUnits="userSpaceOnUse" cx="-19" cy="-21" r="35">
          <stop offset="0" stopColor="#fff" stopOpacity=".32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="50" fill={`url(#${id}-s)`} />
      <circle r="50" fill={`url(#${id}-h)`} />
    </svg>
  );
}

/** Slika lopte (okreće se) — HD izrez ispunjava krug (next/image bira malu varijantu). */
export function GameBallFace({ club, sizes = "96px" }: { club: string; sizes?: string }) {
  return (
    <Image
      src={ballHdSrc(club)}
      alt=""
      fill
      sizes={sizes}
      quality={88}
      draggable={false}
      className="pointer-events-none select-none object-fill"
    />
  );
}

/** Statična lopta (list, ikone). */
export function GameBall({ club, id, className = "" }: { club: string; id: string; className?: string }) {
  return (
    <span className={`relative block overflow-hidden rounded-full bg-[#f2f2f2] ${className}`}>
      <GameBallFace club={club} />
      <GameBallShade id={id} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Kromirani stalak za lopte: vodoravna cijev s kolijevkama (prsteni), */
/*  dvije tanke noge s utegnutim stopama, donja prečka. Krom = isti     */
/*  pojasevi kao šipka s dresovima (ormar-g-rail): svijetlo gore →      */
/*  tamno dolje + topli LED odsjaj.                                      */
/* ------------------------------------------------------------------ */
export const rackGap = (r: number) => Math.max(5, Math.round(r * 0.3));

export function rackSize(n: number, r: number) {
  const g = rackGap(r);
  // Visoke noge: lopte stoje na "izložbenoj" visini, u ravnini sa stalkom za kape.
  return { w: n * 2 * r + (n + 1) * g, h: Math.round(r * 3.5) };
}
/** Središta lopti relativno na gornji lijevi kut stalka. */
export function rackSlots(n: number, r: number) {
  const g = rackGap(r);
  const barY = rackBarY(n, r);
  return Array.from({ length: n }, (_, i) => ({ x: g + r + i * (2 * r + g), y: barY - r * 0.8 }));
}
export const rackBarY = (_n: number, r: number) => r * 0.9;

function ChromeTube({ x, y, w, t, id }: { x: number; y: number; w: number; t: number; id: string }) {
  return (
    <g>
      <rect x={x} y={y - t / 2} width={w} height={t} rx={t / 2} fill={`url(#${id})`} />
      <rect x={x + t * 0.6} y={y - t * 0.32} width={w - t * 1.2} height={Math.max(0.6, t * 0.16)} rx={0.4} fill="#fff" opacity=".8" />
    </g>
  );
}

export function ChromeDefs() {
  return (
    <defs>
      {/* vodoravna cijev: pojasevi kao na šipci */}
      <linearGradient id="ndc-tube" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e6e8eb" />
        <stop offset=".2" stopColor="#e6e8eb" />
        <stop offset=".2" stopColor="#b2b5ba" />
        <stop offset=".45" stopColor="#b2b5ba" />
        <stop offset=".45" stopColor="#62656b" />
        <stop offset=".72" stopColor="#62656b" />
        <stop offset=".72" stopColor="#28292d" />
        <stop offset="1" stopColor="#3a3b40" />
      </linearGradient>
      {/* okomita cijev: svjetlo slijeva */}
      <linearGradient id="ndc-post" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#4a4c51" />
        <stop offset=".28" stopColor="#f1f2f4" />
        <stop offset=".5" stopColor="#a3a6ab" />
        <stop offset=".78" stopColor="#3b3d42" />
        <stop offset="1" stopColor="#202125" />
      </linearGradient>
      <linearGradient id="ndc-foot" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2f3f5" />
        <stop offset=".45" stopColor="#8d9096" />
        <stop offset="1" stopColor="#2a2b2f" />
      </linearGradient>
      <radialGradient id="ndc-shadow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#000" stopOpacity=".85" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ndc-panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".055" />
        <stop offset=".5" stopColor="#fff" stopOpacity=".02" />
        <stop offset="1" stopColor="#fff" stopOpacity=".008" />
      </linearGradient>
      <radialGradient id="ndc-led" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffeccc" stopOpacity=".16" />
        <stop offset="1" stopColor="#ffeccc" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Noga s utegnutom stopom (disk). */
export function ChromeLeg({ x, y0, y1, t = 3.6 }: { x: number; y0: number; y1: number; t?: number }) {
  return (
    <g>
      <rect x={x - t / 2} y={y0} width={t} height={y1 - y0 - 3} rx={t / 2} fill="url(#ndc-post)" />
      <ellipse cx={x} cy={y1 - 2.4} rx={t * 2.6} ry={2.6} fill="url(#ndc-foot)" />
      <ellipse cx={x} cy={y1 - 3.4} rx={t * 2.1} ry={0.7} fill="#fff" opacity=".55" />
    </g>
  );
}

export function BallRack({ n, r }: { n: number; r: number }) {
  const { w, h } = rackSize(n, r);
  const barY = rackBarY(n, r);
  const slots = rackSlots(n, r);
  const inset = Math.max(6, r * 0.45);
  const legX = [inset, w - inset];
  const t = Math.max(4, r * 0.2);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block overflow-visible" aria-hidden>
      <ChromeDefs />
      {/* topli odsjaj na podu + sjena */}
      <ellipse cx={w / 2} cy={h - 1} rx={w * 0.62} ry={9} fill="url(#ndc-led)" />
      <ellipse cx={w / 2} cy={h - 1.5} rx={w * 0.54} ry={4.5} fill="url(#ndc-shadow)" />
      {legX.map((x) => (
        <ChromeLeg key={x} x={x} y0={barY} y1={h} t={t * 0.85} />
      ))}
      {/* donja prečka */}
      <ChromeTube x={legX[0]} y={h - r * 0.7} w={legX[1] - legX[0]} t={t * 0.6} id="ndc-tube" />
      {/* stražnji polukrugovi kolijevki (iza lopte) */}
      {slots.map((s, i) => (
        <path
          key={`b${i}`}
          d={`M ${s.x - r * 0.8} ${barY} A ${r * 0.8} ${r * 0.22} 0 0 1 ${s.x + r * 0.8} ${barY}`}
          fill="none"
          stroke="#55585e"
          strokeWidth={t * 0.45}
        />
      ))}
      {/* glavna cijev */}
      <ChromeTube x={1} y={barY} w={w - 2} t={t} id="ndc-tube" />
      {/* završni čepovi */}
      {[1, w - 1].map((x) => (
        <circle key={x} cx={x} cy={barY} r={t * 0.62} fill="url(#ndc-foot)" />
      ))}
    </svg>
  );
}

/* Prednji polukrugovi kolijevki — crtaju se IZNAD lopti na stalku. */
export function BallRackFront({ n, r }: { n: number; r: number }) {
  const { w, h } = rackSize(n, r);
  const barY = rackBarY(n, r);
  const slots = rackSlots(n, r);
  const t = Math.max(4, r * 0.2);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="pointer-events-none block overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="ndc-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d6066" />
          <stop offset=".35" stopColor="#f4f5f7" />
          <stop offset=".6" stopColor="#9a9da3" />
          <stop offset="1" stopColor="#3a3c41" />
        </linearGradient>
      </defs>
      {slots.map((s, i) => (
        <path
          key={i}
          d={`M ${s.x - r * 0.8} ${barY} A ${r * 0.8} ${r * 0.22} 0 0 0 ${s.x + r * 0.8} ${barY}`}
          fill="none"
          stroke="url(#ndc-ring)"
          strokeWidth={t * 0.55}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
