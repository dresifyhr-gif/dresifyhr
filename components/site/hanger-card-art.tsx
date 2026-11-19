"use client";

import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { HOOK_GEO, type HookGeo } from "@/components/product/hanger-hooks";
import { useHangerCardVariant, type HangerCardArtProps } from "@/components/providers/hanger-cards-context";
import { cardName, type CardName } from "@/components/site/hanger-card-name";
import type { HangerImages } from "@/lib/data/ormar-hanger";

/* ------------------------------------------------------------------ */
/*  Kartica kataloga "na vješalici" — mala pozornica kao na stranici    */
/*  "Pogledaj dres": tamni zid, kromirana šipka preko širine kartice    */
/*  (bez nosača), svaka kartica ima SVOJU šipku — u gridu ostaje razmak */
/*  između kartica, šipke se ne spajaju. Meki reflektor i sjena na podu.*/
/*  Jedinice pozornice 1000 × 1250 (omjer 4/5 = isti kao stare kartice).*/
/*  Računalo: miš iznad → lagani zamah + okret na prednju stranu.       */
/*  Mobitel: mirno, jedan tihi zamah kad kartica uđe u ekran.           */
/* ------------------------------------------------------------------ */

const SW = 1000;
const SH = 1250;
const WIRE = 4 / 900; // debljina žice kuke → unutarnji vrh zavoja
const FALLBACK: HookGeo = { t: 0.004, x: 0.53, a: 0.7 };
const ROD_D = 16;
/* Ista visina šipke za SVE kartice (dres i trenirka), da red izgleda ujednačeno.
   Visoko, iznad srca (srce na karticama s vješalicom sjeda odmah ispod šipke). */
const ROD_TOP = 70;
/* Hlače s prečkom (dočrtana kuka) vise na malo duljem vratu kuke — kao one sa snimljenom kukom. */
const PANTS_DROP = 40;
const PAIR_W = 700;
const PAIR_CX = 425;
/* Šipka ne ide do samog ruba kartice: mali uvlak s obje strane, zaobljeni krajevi. */
const ROD_INSET = 34;
/** Položaj šipke u postocima visine pločice (srce sjeda odmah ispod nje). */
export const RAIL_TOP_PCT = (ROD_TOP / SH) * 100;
export const RAIL_H_PCT = (ROD_D / SH) * 100;
export const RAIL_BOTTOM_PCT = RAIL_TOP_PCT + RAIL_H_PCT;
const RAIL_INSET_PCT = (ROD_INSET / SW) * 100;

/* Izgled "ime": šipka niže (srce gore desno iznad nje), dres ~80 % veličine — između rukava i
   ruba kartice ostane dovoljno zida da se prezime pročita i na mobitelu (kartica ~173 px). */
const ROD_TOP_IME = 225;
const IME_SCALE = 0.8;
export const RAIL_TOP_IME_PCT = (ROD_TOP_IME / SH) * 100;
/** srce u izgledu "ime": sredina znaka na pola visine između vrha kartice i šipke */
export const HEART_TOP_IME = `calc(${(RAIL_TOP_IME_PCT / 2).toFixed(2)}% - 22px)`;

type Box = { key: string; src: string; label: string; l: number; t: number; w: number; h: number; hx: number; bar: boolean };
/** faces = ono što se vidi; alt = druga strana dresa (okret na miš / dugi dodir). */
type Lay = { faces: Box[]; alt?: Box; rodTop: number; floorY: number; pair: boolean; ph: boolean };

const geo = (src: string) => HOOK_GEO[src] ?? FALLBACK;

/** ime: izgled "ime" — prednja strana sprijeda, leđa (ime + broj) na okret, kao u reklami;
    worded: kartica ima natpis (dres se smanji da natpis diše). Bez slika → obris "uskoro". */
function layout(img: HangerImages | undefined, ime = false, worded = false): Lay {
  const rodTop = ime ? ROD_TOP_IME : ROD_TOP;
  if (!img) {
    // obris dresa (Fotografija uskoro) u istim mjerama kao dres na vješalici
    const h = 690 * IME_SCALE;
    const w = 580 * IME_SCALE;
    const b: Box = { key: "ph", src: "", label: "", l: SW / 2 - w / 2, t: rodTop + 120 * IME_SCALE, w, h, hx: SW / 2, bar: false };
    return { faces: [b], rodTop, floorY: b.t + b.h + 10, pair: false, ph: true };
  }
  if (img.kind === "dres") {
    const gb = geo(img.back);
    // izgled "ime": SVI dresovi u istom mjerilu (ista visina), neovisno o širini slike
    const H = ime && worded ? 880 * IME_SCALE : Math.min(880, 640 / gb.a);
    const box = (key: string, src: string, label: string, g: HookGeo): Box => {
      const w = g.a * H;
      return { key, src, label, l: SW / 2 - g.x * w, t: rodTop - (g.t + WIRE) * H, w, h: H, hx: SW / 2, bar: false };
    };
    const back = box("back", img.back, "leđa dresa", gb);
    const front = img.front ? box("front", img.front, "prednja strana dresa", geo(img.front)) : undefined;
    const floorY = back.t + back.h - 4;
    if (ime && front) return { faces: [front], alt: back, rodTop, floorY, pair: false, ph: false };
    return { faces: [back], alt: front, rodTop, floorY, pair: false, ph: false };
  }

  // Trenirka: jakna lijevo (sprijeda), hlače desno — dvije vješalice, malo preklopljene.
  const parts = [
    img.jakna ? { key: "jakna", src: img.jakna, label: "jakna trenirke" } : null,
    img.hlace ? { key: "hlace", src: img.hlace, label: "hlače trenirke" } : null,
  ].filter(Boolean) as { key: string; src: string; label: string }[];
  const gs = parts.map((p) => geo(p.src));
  const overlap = parts.length > 1 ? 70 : 0;
  const sumA = gs.reduce((s, g) => s + g.a, 0) || 1;
  // Par je ograničen širinom: desni rub ≤ 775 jedinica, da hlače ne idu pod srce (srce je
  // odmah ispod šipke, gore desno — na mobitelu počinje već na ~79 % širine).
  // Izgled "ime": srce je IZNAD šipke → par je centriran; bez natpisa (streetwear) veći, da zid
  // ne ostane poluprazan; s natpisom malo manji (natpis stoji ispod para).
  const pairW = ime ? (worded ? 640 : 900) : PAIR_W;
  const H = Math.min(ime ? (worded ? 540 : 820) : 720, (pairW + overlap) / sumA);
  const stem = H * 0.05;
  const total = sumA * H - overlap;
  // par ulijevo: desna vješalica (hlače) ne smije pod srce gore desno
  let l = (parts.length > 1 && !ime ? PAIR_CX : SW / 2) - total / 2;
  const faces: Box[] = parts.map((p, i) => {
    const g = gs[i];
    const w = g.a * H;
    const off = g.bar ? -(ROD_D * 0.5 + stem + PANTS_DROP) : (g.t + WIRE) * H;
    const b: Box = { ...p, l, t: rodTop - off, w, h: H, hx: l + g.x * w, bar: !!g.bar };
    l += w - overlap;
    return b;
  });
  return {
    faces,
    rodTop,
    floorY: Math.max(...faces.map((f) => f.t + f.h)) - 6,
    pair: true,
    ph: false,
  };
}

const px = (u: number) => `${(u / SW) * 100}%`;
const py = (u: number) => `${(u / SH) * 100}%`;
const boxStyle = (b: Box): React.CSSProperties => ({ left: px(b.l), top: py(b.t), width: px(b.w), height: py(b.h) });

// Pločica je u gridu 2/3/4 stupca; slika zauzima ~2/3 širine pločice.
const SIZES = "(min-width: 1280px) 250px, (min-width: 1024px) 22vw, (min-width: 640px) 32vw, 36vw";
const SIZES_PANTS = "(min-width: 1280px) 150px, (min-width: 1024px) 13vw, (min-width: 640px) 19vw, 22vw";

/* ---------- jedan zajednički promatrač za "zamah pri ulasku" (mobitel) ---------- */
let io: IntersectionObserver | null = null;
const ioCbs = new WeakMap<Element, () => void>();
function observeOnce(el: Element, cb: () => void) {
  if (typeof IntersectionObserver === "undefined") return () => {};
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          ioCbs.get(e.target)?.();
          ioCbs.delete(e.target);
          io?.unobserve(e.target);
        }
      },
      { threshold: 0.45 },
    );
  }
  ioCbs.set(el, cb);
  io.observe(el);
  return () => {
    ioCbs.delete(el);
    io?.unobserve(el);
  };
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ---------- veliki obrubljeni natpis: JEDNAKO za sve kartice ----------
   Ista veličina slova, ista visina (u struku dresa), isti razmak slova, isti obrub —
   red kartica izgleda kao jedan niz. Dugačko prezime se ne smanjuje: rub kartice ga odreže. */
const NAME_FS = 380; // visina slova ≈ 0.7 em ≈ 21 % visine kartice (~46 px na mobitelu)
const NAME_LS = 0.03; // razmak slova (em)
const NAME_Y = 650 + NAME_FS * 0.35; // osnovna linija: sredina slova u visini struka dresa

/** Riječ koju kartica stvarno prikazuje (nakon provjere susjeda) — null = bez natpisa. */
type Slot = { word: string | null };

export function HangerCardArt(props: HangerCardArtProps) {
  const variant = useHangerCardVariant(props.variant);
  const ime = variant === "ime";
  if (!props.images && !ime) return null;
  return <HangerCardArtInner {...props} ime={ime} />;
}

function HangerCardArtInner({
  images,
  active: hoverProp,
  label,
  priority = false,
  dim = false,
  product,
  ime,
}: HangerCardArtProps & { ime: boolean }) {
  // Okret samo na pravom mišu: na dodirnim ekranima preglednik zna nakon dodira poslati
  // "mouse" pointer događaje (npr. kad se otvori donji list) — tada ne vrtimo karticu iza lista.
  const [fineHover, setFineHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const on = () => setFineHover(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  // Izgled "ime", dugi dodir (mobitel): drži prst → dres se okrene na leđa; pusti → natrag.
  const [held, setHeld] = useState(false);
  const holdT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const active = (hoverProp && fineHover) || held;

  const name: CardName | undefined = useMemo(() => (ime && product ? cardName(product) : undefined), [ime, product]);
  const lay = useMemo(() => layout(images, ime, !!name), [images, ime, name]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);

  /* Susjedi (DOM redoslijed u gridu): isto prezime kao jedna od 3 prethodne kartice → riječ
     kluba/reprezentacije (MODRIĆ → HRVATSKA), a ako je i ona zauzeta → bez natpisa.
     Natpis se pojavi (opacity) tek kad je ovo odlučeno — bez skakanja. */
  const [slot, setSlot] = useState<Slot | null>(null);
  useIsoLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!name) {
      el.dataset.hcWord = "";
      setSlot(null);
      return;
    }
    let node: Element = el.closest("article") ?? el;
    while (node.parentElement && node.parentElement.childElementCount === 1) node = node.parentElement;
    const near: string[] = [];
    let idx = 0;
    for (let s = node.previousElementSibling; s && idx < 3; s = s.previousElementSibling, idx++) {
      const w = s.querySelector<HTMLElement>(".hc-stage")?.dataset.hcWord;
      if (w) near.push(w);
    }
    const word = [name.word, name.alt].find((w): w is string => !!w && !near.includes(w)) ?? null;
    el.dataset.hcWord = word ?? "";
    setSlot({ word });
  }, [name]);

  // Druga strana se učitava tek na prvi prelazak mišem / dodir (bez nepotrebnog prometa).
  const [altReady, setAltReady] = useState(false);
  useEffect(() => {
    if (active && lay.alt) setAltReady(true);
  }, [active, lay.alt]);
  const [altLoaded, setAltLoaded] = useState(false);
  const turned = active && !!lay.alt && altLoaded;

  const endHold = () => {
    if (holdT.current) clearTimeout(holdT.current);
    holdT.current = null;
    setHeld(false);
  };
  useEffect(() => () => {
    if (holdT.current) clearTimeout(holdT.current);
  }, []);
  const holdHandlers = ime && lay.alt
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType === "mouse") return;
          heldRef.current = false;
          setAltReady(true);
          holdT.current = setTimeout(() => {
            heldRef.current = true;
            setHeld(true);
          }, 320);
        },
        onPointerUp: endHold,
        onPointerCancel: endHold,
        onPointerLeave: endHold,
        // nakon dugog dodira ne otvaraj stranicu dresa i ne pokazuj izbornik preglednika
        onClickCapture: (e: React.MouseEvent) => {
          if (!heldRef.current) return;
          heldRef.current = false;
          e.preventDefault();
          e.stopPropagation();
        },
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : undefined;

  // Mobitel: jedan tihi zamah kad kartica uđe u ekran.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return observeOnce(el, () => setEntered(true));
  }, []);

  const { floorY, rodTop: ROD_Y, pair, ph } = lay;
  const swingClass = active ? "hc-swing-on" : entered ? "hc-swing-in" : "";

  const word = slot ? slot.word : name?.word;

  return (
    <div
      ref={rootRef}
      {...holdHandlers}
      data-hc-word={name?.word ?? ""}
      className={`hc-stage relative aspect-[4/5] w-full overflow-hidden ${ime ? "hc-ime" : ""} ${active ? "hc-active" : ""} ${turned ? "hc-flip" : ""}`}
      {...(ph ? { role: "img", "aria-label": `${label} — fotografija na vješalici uskoro` } : null)}
    >
      {/* sjena šipke na zidu (bez reflektora/konusa svjetla — vlasnik ga je maknuo s kartica) */}
      <svg aria-hidden viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={`${uid}ws`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.5" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* sjena šipke na zidu — ista širina kao šipka */}
        <rect x={ROD_INSET + ROD_D} y={ROD_Y + ROD_D * 0.7} width={SW - 2 * (ROD_INSET + ROD_D)} height={ROD_D * 3} fill={`url(#${uid}ws)`} />
      </svg>

      {/* izgled "ime": veliko obrubljeno prezime na zidu iza dresa (samo obrub, bez ispune) —
          ista veličina i ista visina na svakoj kartici */}
      {ime && word && (
        <svg aria-hidden viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" className={`hc-name pointer-events-none absolute inset-0 h-full w-full ${slot ? "hc-on" : ""}`}>
          <text x={SW / 2} y={NAME_Y} textAnchor="middle" fontSize={NAME_FS} letterSpacing={NAME_FS * NAME_LS} vectorEffect="non-scaling-stroke">
            {word}
          </text>
        </svg>
      )}

      {/* šipka: preko širine kartice s malim uvlakom, bez nosača, ne prelazi u razmak grida.
          Ispod kuka (vješalice se crtaju poslije). */}
      <span aria-hidden className="hc-railbar pointer-events-none" />
      {/* kontaktna sjena kuke na šipki */}
      <svg aria-hidden viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`${uid}ct`}>
            <stop offset="0" stopColor="#000" stopOpacity="0.8" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {lay.faces.map((b) => (
          <ellipse key={b.key} cx={b.hx} cy={ROD_Y + ROD_D * 0.62} rx={ROD_D * 1.5} ry={ROD_D * 0.42} fill={`url(#${uid}ct)`} />
        ))}
      </svg>

      {/* sjene na podu */}
      {lay.faces.map((b) => (
        <div
          key={b.key}
          aria-hidden
          className="hc-shadow pointer-events-none absolute"
          style={{ left: px(b.hx - b.w * 0.44), top: py(floorY - 16), width: px(b.w * 0.88), height: "3%" }}
        />
      ))}

      {/* vješalice */}
      {/* rasprodano: kod "ime" zatamni (ne prozirno), inače bi se natpis vidio kroz dres */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${dim ? (ime ? "brightness-[.42] saturate-[.5]" : "opacity-40") : ""}`}>
        {ph && <Placeholder rodTop={ROD_Y} uid={uid} />}
        {!ph && lay.faces.map((b, i) => {
          const origin = `${(b.hx / SW) * 100}% ${(ROD_Y / SH) * 100}%`;
          const isMain = i === 0 && !pair;
          return (
            <div
              key={b.key}
              className={`hc-swing absolute inset-0 ${swingClass}`}
              style={{ transformOrigin: origin, animationDelay: pair && i === 1 ? "90ms" : undefined, zIndex: pair ? (b.key === "jakna" ? 2 : 1) : undefined }}
            >
              {b.bar && <PantsHook b={b} rodTop={ROD_Y} uid={`${uid}${i}`} />}
              <div className={`hc-turn absolute inset-0 ${turned && isMain ? "hc-turned" : ""}`} style={{ transformOrigin: origin }}>
                <div className="hc-face hc-face-a absolute" style={boxStyle(b)}>
                  <Image
                    src={b.src}
                    alt={`${label} — ${b.label} na vješalici`}
                    fill
                    priority={priority}
                    loading={priority ? undefined : "lazy"}
                    sizes={b.key === "hlace" ? SIZES_PANTS : SIZES}
                    draggable={false}
                    className="pointer-events-none select-none object-contain object-top"
                  />
                </div>
                {isMain && lay.alt && altReady && (
                  <div className="hc-face hc-face-b absolute" style={boxStyle(lay.alt)} aria-hidden={!turned}>
                    <Image
                      src={lay.alt.src}
                      alt={`${label} — ${lay.alt.label} na vješalici`}
                      fill
                      sizes={SIZES}
                      draggable={false}
                      onLoad={() => setAltLoaded(true)}
                      className="pointer-events-none select-none object-contain object-top"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Proizvod bez fotografije na vješalici (izgled "ime"): ista pozornica, šipka, kuka, tamna
   vješalica i obris dresa s "Fotografija uskoro" — nikad sirova siva/bijela fotografija. */
function Placeholder({ rodTop, uid }: { rodTop: number; uid: string }) {
  const r = rodTop + ROD_D / 2;
  return (
    <svg aria-hidden viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={`${uid}phk`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6d7177" />
          <stop offset="0.45" stopColor="#d9dce0" />
          <stop offset="1" stopColor="#8a8e94" />
        </linearGradient>
        <linearGradient id={`${uid}phs`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e2e2e" />
          <stop offset="1" stopColor="#202020" />
        </linearGradient>
      </defs>
      <g transform={`translate(500 ${r}) scale(${IME_SCALE}) translate(-500 ${-r})`}>
        <path d={`M500 ${r + 62} L500 ${r + 14} A14 14 0 1 0 472 ${r}`} fill="none" stroke={`url(#${uid}phk)`} strokeWidth="6" strokeLinecap="round" />
        <path d={`M500 ${r + 60} L300 ${r + 150} L700 ${r + 150} Z`} fill="none" stroke="#2c2d31" strokeWidth="13" strokeLinejoin="round" />
        <path
          d={`M410 ${r + 120} Q500 ${r + 175} 590 ${r + 120} L735 ${r + 180} L790 ${r + 330} L705 ${r + 365} L690 ${r + 320} L690 ${r + 790} Q500 ${r + 812} 310 ${r + 790} L310 ${r + 320} L295 ${r + 365} L210 ${r + 330} L265 ${r + 180} Z`}
          fill={`url(#${uid}phs)`}
          stroke="#ffffff24"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text x="500" y={r + 470} textAnchor="middle" fill="#ffffff73" fontSize="46" fontFamily="inherit">
          Fotografija uskoro
        </text>
      </g>
    </svg>
  );
}

/* Dočrtana kromirana kuka za vješalice s prečkom (hlače). */
function PantsHook({ b, rodTop: ROD_Y, uid }: { b: Box; rodTop: number; uid: string }) {
  const sw = Math.max(2.6, ROD_D * 0.24);
  const cy = ROD_Y + ROD_D / 2;
  const R = ROD_D / 2 + sw * 0.55;
  const x = b.hx;
  const top = b.t + b.h * 0.012;
  const d0 = `M ${x} ${top} L ${x} ${cy} A ${R} ${R} 0 0 0 ${x - 2 * R} ${cy} q 0 ${R * 0.9} ${-R * 0.7} ${R * 1.2}`;
  return (
    <svg aria-hidden viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[1] h-full w-full">
      <defs>
        <linearGradient id={`${uid}hk`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6d7177" />
          <stop offset="0.45" stopColor="#d9dce0" />
          <stop offset="1" stopColor="#8a8e94" />
        </linearGradient>
      </defs>
      <path d={d0} fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth={sw + 2} strokeLinecap="round" transform="translate(1.5 2)" />
      <path d={d0} fill="none" stroke={`url(#${uid}hk)`} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={x} cy={top} r={sw * 1.15} fill="#2b2d31" />
    </svg>
  );
}

/* ?kartica=ime|vjesalica → atribut na <html> PRIJE prvog iscrtavanja (inline skripta prije kartica),
   da se do hidracije ne vidi krivi izgled. <html> ima suppressHydrationWarning. */
const URL_SCRIPT = `try{var k=new URLSearchParams(location.search).get("kartica");if(k==="ime"||k==="vjesalica")document.documentElement.setAttribute("data-kartica",k);else document.documentElement.removeAttribute("data-kartica")}catch(e){}`;
export function HangerCardUrlScript() {
  return <script dangerouslySetInnerHTML={{ __html: URL_SCRIPT }} />;
}

/* Stilovi — jednom po stranici (renderira ih HangerCardsProvider). */
export const HANGER_CARD_CSS = `
.hc-railbar{position:absolute;display:block;top:${RAIL_TOP_PCT}%;height:${RAIL_H_PCT}%;min-height:4px;
 left:${RAIL_INSET_PCT}%;right:${RAIL_INSET_PCT}%;border-radius:999px;
 background:linear-gradient(90deg,rgba(10,10,10,.75) 0%,rgba(10,10,10,0) 5%,rgba(10,10,10,0) 95%,rgba(10,10,10,.75) 100%),
 linear-gradient(180deg,#55595f 0%,#d6d9dd 12%,#b4b8bd 30%,#72767c 52%,#2a2c30 76%,#3d4045 90%,#141517 100%)}
.hc-stage{background:
 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .03 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
 linear-gradient(180deg,#171717 0%,#101010 55%,#0a0a0a 100%)}
.hc-stage::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
 background:radial-gradient(ellipse 60% 45% at 50% 42%,rgba(255,240,220,.07),rgba(255,240,220,0) 70%);
 opacity:0;transition:opacity .45s ease}
.hc-active.hc-stage::after{opacity:1}
.hc-shadow{background:radial-gradient(ellipse 50% 50% at 50% 50%,rgba(0,0,0,.9),rgba(0,0,0,.42) 42%,rgba(0,0,0,0) 72%)}
.hc-flip .hc-shadow{animation:hc-shadow .8s cubic-bezier(.65,0,.35,1)}
.hc-swing{will-change:auto}
.hc-swing-on{animation:hc-swing 1.9s cubic-bezier(.3,0,.25,1)}
.hc-swing-in{animation:hc-sway 1.7s cubic-bezier(.3,0,.25,1)}
/* simetrično ubrzanje: rub (90°) točno na pola vremena → zamjena lica tada, bez praznog trenutka */
.hc-turn{transform-style:preserve-3d;transform:perspective(1500px) rotateY(0deg);transition:transform .8s cubic-bezier(.65,0,.35,1)}
.hc-turned{transform:perspective(1500px) rotateY(180deg)}
.hc-face{-webkit-backface-visibility:hidden;backface-visibility:hidden}
.hc-face-a{transition:opacity 0s linear .4s}
.hc-face-b{transform:rotateY(180deg);opacity:0;transition:opacity 0s linear .4s}
.hc-turned .hc-face-a{opacity:0}
.hc-turned .hc-face-b{opacity:1}
/* izgled "ime" (kao reklama): ugljeni zid, obrubljeno prezime iza dresa */
.hc-stage.hc-ime{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;background:
 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .035 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
 linear-gradient(180deg,#232323 0%,#1b1b1b 50%,#121212 100%)}
.hc-ime .hc-railbar{top:${RAIL_TOP_IME_PCT}%}
.hc-name{opacity:0;transition:opacity .5s ease}
.hc-name.hc-on{opacity:1}
.hc-name text{font-family:var(--font-bebas),"Bebas Neue",Impact,sans-serif;fill:none;stroke:#e8ff3c;stroke-opacity:.34;stroke-width:.9px;transition:stroke-opacity .45s ease}
.hc-active .hc-name text{stroke-opacity:.5}
/* ?kartica=… prije hidracije (atribut postavlja skripta providera): ne prikazuj krivi izgled */
html[data-kartica=ime] .hc-stage:not(.hc-ime)>*,html[data-kartica=ime] .hc-fallback>*,
html[data-kartica=vjesalica] .hc-stage.hc-ime>*{visibility:hidden}
html[data-kartica=ime] .hc-stage:not(.hc-ime),html[data-kartica=ime] .hc-fallback{background:linear-gradient(180deg,#232323 0%,#1b1b1b 50%,#121212 100%)}
html[data-kartica=ime] .hc-heart{top:${HEART_TOP_IME}!important}
html[data-kartica=ime] .hc-pill{visibility:hidden}
html[data-kartica=ime] .hc-plus-old{transform:scale(.82);opacity:.7}
@keyframes hc-swing{0%{transform:rotate(0)}16%{transform:rotate(2.4deg)}38%{transform:rotate(-1.7deg)}60%{transform:rotate(.9deg)}80%{transform:rotate(-.35deg)}100%{transform:rotate(0)}}
@keyframes hc-sway{0%{transform:rotate(0)}22%{transform:rotate(1.4deg)}50%{transform:rotate(-.9deg)}76%{transform:rotate(.35deg)}100%{transform:rotate(0)}}
@keyframes hc-shadow{0%{transform:scaleX(1)}50%{transform:scaleX(.5)}100%{transform:scaleX(1)}}
@media (prefers-reduced-motion:reduce){
 .hc-swing-on,.hc-swing-in,.hc-flip .hc-shadow{animation:none}
 .hc-turn,.hc-face-a,.hc-face-b{transition:none}
}`;
