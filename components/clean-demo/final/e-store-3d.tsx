"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from "react";

import type { OrmarRailItem } from "@/lib/data/ormar-items";
import { pieces } from "@/components/home/ormar/ormar-g-art";
import { itemAspect, itemWeight } from "@/components/home/ormar/ormar-g-lib";
import { ballHdSrc } from "@/components/naslovnica/nd-balls";
import { capSrc } from "@/components/naslovnica/nd-caps";
import { StoreEngine, type EngineItem } from "@/components/naslovnica/three/engine";
import type { GraffitiArt } from "@/components/naslovnica/three/graffiti";

import { E_GRAF_TOP_PX, E_HEM, E_HEM_LITE_PX } from "./e-css";
import { applyEFrame, type EFrameApi } from "./e-frame";
import { logoMetrics } from "./e-logo";
import { useEText } from "./e-i18n";

/* ------------------------------------------------------------------ */
/*  Smjer E — platno scene. Isti StoreEngine (nepromijenjen); kadar,   */
/*  veći dres u fokusu, dubinska oštrina, tkanina i proceduralni zid    */
/*  postavlja e-frame. Natpis crta EHome (control: goBy, goTo, rect).    */
/* ------------------------------------------------------------------ */

const toEngine = (it: OrmarRailItem): EngineItem => {
  const aspect = itemAspect(it);
  return {
    slug: it.slug,
    weight: itemWeight(it),
    aspect,
    pieces: pieces(it, 1).map((pc) => ({
      src: pc.src,
      dx: pc.left + pc.width / 2 - aspect / 2,
      top: pc.inner?.top ?? 0,
      height: pc.inner?.height ?? 1,
      drawHook: Boolean(pc.hook),
      barY: (pc.inner?.top ?? 0) + 0.002,
    })),
  };
};

/** ?grafit=meta|slika: usporedba sa starom slikom grafita (samo tada se PNG skida). */
function keepGrafPng() {
  try {
    const g = new URLSearchParams(window.location.search).get("grafit");
    return g === "meta" || g === "slika";
  } catch {
    return false;
  }
}

/** ?realizam=3d: stari izgled (dubinski reljef + tkanina + DOF + odraz) za usporedbu.
 *  Zadano: ravna HQ fotografija dresa (samo njihanje vješalice). */
export function realism3d() {
  try {
    return new URLSearchParams(window.location.search).get("realizam") === "3d";
  } catch {
    return false;
  }
}

/** Prazna "slika" natpisa s mjerama logotipa/čistog zida (e-frame je odmah zamijeni ili sakrije). */
function blankArt(wall: "logo" | "none", mobile: boolean): GraffitiArt {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 2;
  const m = wall === "logo" ? logoMetrics() : { aspect: mobile ? 3.2 : 7.4, base: 0, top: 1, ext: 1 };
  return { canvas, aspect: m.aspect, base: m.base, top: m.top, ext: m.ext, lumKey: false, neonX0: 0.5, neonX1: 0.5 };
}

export type EStoreControl = {
  goBy: (dir: number) => void;
  goTo: (i: number) => void;
  /** okvir dresa i na ekranu (viewport px) ili null ako nije u kadru */
  rect: (i: number) => DOMRect | null;
  /** obrisano prezime iza dresa: središte i em u px prozora (za prijelaz) */
  nameBox: () => { cx: number; cy: number; font: number; name: string } | null;
  /** y šipke u px prozora */
  railY: () => number | null;
  /** šipka se upravo kreće (film): teški poslovi (prefetch, kopija) čekaju mirovanje */
  moving?: () => boolean;
  /** prsten: zadnji pomak je napravio auto-okret (bez interakcije) — bez prefetcha stranice dresa */
  autoplay?: () => boolean;
  /** prsten: korisnik je nešto napravio u heroju → auto-okret staje (nastavlja nakon mirovanja) */
  interact?: () => void;
};

export type EStoreProps = {
  list: OrmarRailItem[];
  /** visina platna (px) */
  sceneH: number;
  revealed: boolean;
  productHref: (slug: string) => string;
  onOpenItem: (slug: string) => void;
  onFirstFrame: () => void;
  onFail: () => void;
  /** aktivni (središnji) dres na šipki */
  onActive: (i: number) => void;
  /** strelice: DHome zove control.current.goBy(±1) */
  control: MutableRefObject<EStoreControl | null>;
  /** "logo" = obris DRESIFY na zidu, "none" = čisti beton */
  wall: "logo" | "none";
  /** prezime za stavku i (obris iza dresa u fokusu) */
  surnameOf: (i: number) => string;
  /** početni dres (povratak sa stranice dresa) */
  startIndex: number;
};

export function EStore3D({ list, sceneH, revealed, onOpenItem, onFirstFrame, onFail, onActive, control, wall, surnameOf, startIndex }: EStoreProps) {
  const [mobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  const tx = useEText();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engine = useRef<StoreEngine | null>(null);
  const listRef = useRef(list);
  listRef.current = list;

  const api = useRef<EFrameApi | null>(null);
  const lastActive = useRef(-1);
  const nameOf = useRef(surnameOf);
  nameOf.current = surnameOf;
  const setActive = (i: number) => {
    const n = listRef.current.length;
    const prev = lastActive.current;
    let dir = prev < 0 ? 1 : i - prev;
    if (n > 2 && Math.abs(dir) > n / 2) dir = -Math.sign(dir);
    lastActive.current = i;
    api.current?.setName(nameOf.current(i), Math.sign(dir) || 1);
    cb.current.onActive(i);
  };
  const cb = useRef({ onFirstFrame, onFail, onOpenItem, onActive, setActive });
  cb.current = { onFirstFrame, onFail, onOpenItem, onActive, setActive };
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const old3d = realism3d();
    const flat = !old3d;
    // mobitel: bez DOF post-processa i bez odraza poda u stvarnom vremenu (dva najskuplja prolaza);
    // dubinu glume mjerilo, tama i mip-mekoća daljih susjeda
    const lite = mobile && !old3d;
    let eng: StoreEngine;
    try {
      eng = new StoreEngine(
        canvas,
        {
          onActive: (i) => cb.current.setActive(i),
          onOpen: (i) => {
            const it = listRef.current[i];
            if (it) cb.current.onOpenItem(it.slug);
          },
          onJuggle: () => {},
          onStreakEnd: () => {},
          onMix: () => {},
          onAnyFree: () => {},
          onDrag: () => {},
          onFirstFrame: () => cb.current.onFirstFrame(),
        },
        {
          // Smjer D: na sceni su samo dresovi na šipki (bez stalaka s loptama i kapama).
          balls: [],
          caps: [],
          ballSrc: ballHdSrc,
          capSrc,
          mobile,
          // iPhone: puna oštrina (DPR 2) — mutno se ionako računa na pola rezolucije
          dprCap: 2,
          flat,
          dof: !lite,
          reflect: !lite,
          signFont: getComputedStyle(document.body).getPropertyValue("--font-bebas"),
          // stara slika grafita se ovdje nikad ne prikazuje (logo ili čisti beton) → ne skida se
          ...(keepGrafPng() ? {} : { grafArt: () => Promise.resolve(blankArt(wall, mobile)) }),
        }
      );
    } catch (err) {
      console.warn("[3d] init failed", err);
      cb.current.onFail();
      return;
    }
    engine.current = eng;
    control.current = {
      goBy: (dir) => eng.goBy(dir),
      goTo: (i) => eng.goTo(i),
      rect: (i) => {
        try {
          return eng.itemRect(i);
        } catch {
          return null;
        }
      },
      nameBox: () => {
        const b = api.current?.nameBox();
        if (!b) return null;
        const r = canvas.getBoundingClientRect();
        return { ...b, cx: b.cx + r.left, cy: b.cy + r.top };
      },
      railY: () => {
        const y = api.current?.railY();
        return y == null ? null : y + canvas.getBoundingClientRect().top;
      },
    };
    let unlight = () => {};
    try {
      const a = applyEFrame(eng, {
        // bez odraza poda: rub dresa niže (manje praznog poda ispod scene)
        hem: lite ? { ...E_HEM, narrowPx: E_HEM_LITE_PX } : E_HEM,
        grafTopPx: E_GRAF_TOP_PX,
        mobile,
        reduced,
        wall,
        surname: true,
        flat,
        noDof: lite,
      });
      api.current = a;
      unlight = a.off;
    } catch (err) {
      console.warn("[e-frame] off", err);
    }
    const lost = (e: Event) => {
      e.preventDefault();
      cb.current.onFail();
    };
    canvas.addEventListener("webglcontextlost", lost);
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      eng.resize(Math.round(r.width), Math.round(r.height));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => eng.setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(wrap);
    const vis = () => eng.setVisible(document.visibilityState === "visible" && wrap.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", vis);
    eng.setVisible(true);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", vis);
      ro.disconnect();
      io.disconnect();
      unlight();
      api.current = null;
      eng.dispose();
      // isto platno dobije isti WebGL kontekst pri ponovnom montiranju (React dev, povratak):
      // ostavljeni UNPACK_FLIP_Y/PREMULTIPLY bi novom rendereru srušili prazne 3D teksture
      // ("texImage3D: FLIP_Y or PREMULTIPLY_ALPHA isn't allowed") → vrati zadano stanje
      try {
        const gl = canvas.getContext("webgl2");
        if (gl && !gl.isContextLost()) {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        }
      } catch {
        /* bez konteksta */
      }
      engine.current = null;
      control.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const at = Math.max(0, Math.min(list.length - 1, startIndex));
    engine.current?.setItems(list.map(toEngine), at);
    lastActive.current = -1;
    cb.current.setActive(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  useEffect(() => {
    if (revealed) engine.current?.startIntro();
  }, [revealed]);

  return (
    <div className="flex flex-col">
      <div
        ref={wrapRef}
        className="relative shrink-0"
        style={{ height: sceneH }}
        role="group"
        aria-roledescription={tx.carousel}
        aria-label={tx.railDrag}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full select-none"
          style={{
            touchAction: "pan-y",
            cursor: "grab",
            WebkitMaskImage: "linear-gradient(180deg,#000 0,#000 calc(100% - 40px),transparent)",
            maskImage: "linear-gradient(180deg,#000 0,#000 calc(100% - 40px),transparent)",
          }}
        />
        {/* Vinjeta: tamniji rubovi, svjetlo vodi oko na sredinu (običan gradijent, bez blura) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(92% 82% at 50% 42%, transparent 46%, rgba(0,0,0,0.74) 100%)" }}
        />
      </div>
    </div>
  );
}
