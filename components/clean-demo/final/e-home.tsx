"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent, type ReactNode, type RefObject } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import type { OrmarRailItem } from "@/lib/data/ormar-items";
import { displayName } from "@/components/home/ormar/ormar-g-lib";
import { canRun3D } from "@/components/naslovnica/three/nd-hero-3d-gate";

import { E_NAV_H, E_NAV_H_M, ePrice, eVariant } from "./e-css";
import type { FilmHeroProps } from "./film/film-hero";
import { OvalHero, type OvalHeroProps, type OvalSsrFrame } from "./film/oval-hero";
import type { EStoreControl, EStoreProps } from "./e-store-3d";
import { F_BASE, F_BNAV_H, F_HERO_KEY, F_RET_KEY } from "./f-css";
import { imeNames, kidsOnly } from "./ime-lib";
import { isReturning, openProduct } from "./ime-transition";
import { useEText } from "./e-i18n";

// 2D šipka je samo pričuva (twoD je uz film uvijek false) → lijeno, da njezin kod (framer-motion) ne ide u JS naslovnice
const OrmarGRail = dynamic(() => import("@/components/home/ormar/ormar-g-rail").then((m) => m.OrmarGRail));

/* ------------------------------------------------------------------ */
/*  FINAL — naslovnica.                                                 */
/*  Scena E preko prvog ekrana (prozirna navigacija preko nje). Iza     */
/*  dresa u fokusu golemo obrisano prezime (u 3D sceni, ispred zida).   */
/*  ?prezime=oba (zadano): logo DRESIFY na zidu iznad šipke + prezime;  */
/*  ?prezime=samo: čisti beton, samo prezime (kao stranica dresa).      */
/*  Dolje lijevo samo redni broj + klub (prezime je projekcija na zidu,  */
/*  bez dvostrukog naslova), desno cijena i "Pogledaj dres". Otvaranje   */
/*  (gumb ili dodir dresa): kopija dresa, prezimena i šipke sjedne točno */
/*  preko scene i preleti u stranicu dresa (ime-transition).            */
/* ------------------------------------------------------------------ */

const pad = (v: number, w = 2) => String(v).padStart(w, "0");

/** ?3d=… zadrži pri otvaranju (testiranje). */
function withQ(path: string) {
  try {
    const q = new URLSearchParams(window.location.search).get("3d");
    return q ? `${path}?3d=${q}` : path;
  } catch {
    return path;
  }
}

/** posao nakon odgode, ali tek kad šipka miruje (i preglednik je besposlen) — bez trzaja pri listanju */
function afterIdle(control: RefObject<EStoreControl | null>, fn: () => void, delay: number) {
  let t = 0;
  let off = false;
  const run = () => {
    if (off) return;
    if (control.current?.moving?.()) {
      t = window.setTimeout(run, 180);
      return;
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => !off && fn(), { timeout: 700 });
    else fn();
  };
  t = window.setTimeout(run, delay);
  return () => {
    off = true;
    window.clearTimeout(t);
  };
}

type Proxy = {
  slug: string;
  img: string;
  jersey: { left: number; top: number; width: number; height: number };
  name: { cx: number; cy: number; font: number; text: string } | null;
  railY: number | null;
  on: boolean;
  /** poster pri povratku: pretapa se u 3D kad se scena iscrta */
  fade?: boolean;
  poster?: boolean;
};
type Saved = Proxy & { vw: number; vh: number };

export function EHome({ items, children, between, title }: { items: OrmarRailItem[]; children: ReactNode; between?: ReactNode; /** prava naslovnica: vidljivi H1 ispod scene (umjesto sr-only) */ title?: ReactNode }) {
  const tx = useEText();
  const router = useRouter();
  // Prava naslovnica: bez useSearchParams (na statičnoj/ISR ruti bi prebacio katalog i linkove
  // na dresove u klijentsko iscrtavanje → nestali bi iz SSR HTML-a). Fiksno: logo na zidu + film.
  const wall = "logo" as "logo" | "none";
  const film = true as boolean;
  const [desk, setDesk] = useState(true);
  const [sceneH, setSceneH] = useState(760);
  // prije prvog mjerenja (SSR/hidracija) visinu scene drži CSS (= ista formula kao fit na računalu) → bez skoka
  const [fitted, setFitted] = useState(false);
  const [Comp, setComp] = useState<ComponentType<EStoreProps> | null>(null);
  // Zadana scena = prsten koji lebdi (OvalHero, u SSR HTML-u: ploča je LCP slika). ?scena=film = stari film (pričuva):
  // čita se iz window.location u efektu (bez useSearchParams), modul filma se učita tek tada → zadana naslovnica ne nosi
  // ni kod ni podatke filma. ?scena=oval = isto što i zadano (stari linkovi).
  const [alt, setAlt] = useState<ComponentType<FilmHeroProps> | "wait" | null>(null);
  useLayoutEffect(() => {
    let on = false;
    try {
      on = new URLSearchParams(window.location.search).get("scena") === "film";
    } catch {
      /* bez URL-a */
    }
    if (!on) return;
    setAlt("wait");
    let off = false;
    import("./film/film-hero")
      .then((m) => !off && setAlt(() => m.FilmHero))
      .catch((err) => console.warn("[film] chunk failed", err));
    return () => {
      off = true;
    };
  }, []);
  const Hero: ComponentType<OvalHeroProps> | null = alt === null ? OvalHero : alt === "wait" ? null : alt;
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // povratak sa stranice dresa: bez 2D zamjene (druga šipka, drugi dres u fokusu) — ostaje
  // tamna scena s posterom istog dresa dok se 3D ne iscrta
  const [back] = useState(() => isReturning() && (film || canRun3D()));
  const [twoD, setTwoD] = useState(() => !back && !film);
  const poster = useRef(false);
  const [active, setActive] = useState(0);
  const [start, setStart] = useState(0);
  const [proxy, setProxy] = useState<Proxy | null>(null);
  const control = useRef<EStoreControl | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(0);
  activeRef.current = active;
  const opening = useRef(false);

  const surnames = useMemo(() => items.map((it) => imeNames(it.product).surname), [items]);
  const surnameOf = useCallback((i: number) => surnames[i] ?? "", [surnames]);

  // povratak sa stranice dresa: scena se otvori na istom dresu (startIndex ide u engine prije
  // prvog kadra); ako je dres otvoren sa scene, njegova kopija stoji kao poster na istom mjestu
  useLayoutEffect(() => {
    try {
      const s = sessionStorage.getItem(F_HERO_KEY);
      const i = s ? items.findIndex((it) => it.slug === s) : -1;
      if (i > 0) {
        setStart(i);
        setActive(i);
      }
      if (back) {
        const raw = sessionStorage.getItem(F_RET_KEY);
        const p = raw ? (JSON.parse(raw) as Saved) : null;
        if (p && p.slug === s && p.vw === window.innerWidth && p.vh === window.innerHeight && window.scrollY < 40) {
          poster.current = true;
          setProxy({ ...p, on: true, fade: false, poster: true });
        }
      }
    } catch {
      /* bez pohrane */
    }
  }, [items, back]);

  // poster se pretopi u 3D (scena se pod njim pretapa 700 ms, dres se zatim smiri)
  useEffect(() => {
    if (!revealed || !poster.current) return;
    // čeka da se dres u 3D smiri, poster sjedne točno na njegov okvir (izmjereno uživo, kratki
    // pomak), pa se tek onda kratko pretopi — bez dvostruke slike različitih veličina
    const a = setTimeout(() => {
      const m = measure(activeRef.current, true);
      setProxy((q) => (q && m && m.slug === q.slug ? { ...m, fade: false, poster: true } : q));
    }, 1100);
    const b = setTimeout(() => setProxy((q) => (q ? { ...q, fade: true } : q)), 1400);
    const c = setTimeout(() => {
      poster.current = false;
      setProxy((q) => (q ? { ...q, on: false, fade: false, poster: false } : q));
    }, 1700);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);
  // poster je fiksan → kod skrola odmah nestane
  useEffect(() => {
    if (!back) return;
    const on = () => {
      if (!poster.current || window.scrollY < 40) return;
      poster.current = false;
      setProxy((q) => (q ? { ...q, on: false, fade: false, poster: false } : q));
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [back]);

  const infoRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Mobitel (Safari): stvarno vidljiva visina (visualViewport, s trakom adrese) → scena +
    // natpis + gumb + donja traka stanu u prvi ekran bez praznog pojasa. Visina se mjeri jednom
    // (i kad se promijeni širina / okret); skupljanje trake adrese pri skrolu ne mijenja scenu
    // (bez skoka i ponovnog kadriranja tijekom skrola).
    let lastW = 0;
    let lastH = 0;
    const fit = (force = false) => {
      const w = window.innerWidth;
      const vv = window.visualViewport;
      const h = Math.round(Math.min(window.innerHeight, vv ? vv.height * (vv.scale || 1) : window.innerHeight));
      const d = w >= 1024;
      if (!force && !d && w === lastW && Math.abs(h - lastH) < 160) return;
      lastW = w;
      lastH = h;
      setDesk(d);
      setFitted(true);
      if (d) {
        setSceneH(Math.round(Math.max(640, Math.min(1240, h))));
        return;
      }
      // natpis ispod scene (izmjeren; prije prvog mjerenja ~180 px) preklapa scenu M_OVER px
      // (red s cijenom stoji na sjajnom podu)
      const info = infoRef.current?.getBoundingClientRect().height || 180;
      const want = h - F_BNAV_H - info + M_OVER - 6;
      const v = Math.round(Math.max(400, Math.min(w * 1.8, 860, want)));
      setSceneH((p) => (Math.abs(p - v) < 3 ? p : v));
    };
    fit(true);
    const onR = () => fit();
    window.addEventListener("resize", onR);
    window.addEventListener("orientationchange", onR);
    const ro = typeof ResizeObserver !== "undefined" && infoRef.current ? new ResizeObserver(() => fit(true)) : null;
    if (ro && infoRef.current) ro.observe(infoRef.current);
    return () => {
      window.removeEventListener("resize", onR);
      window.removeEventListener("orientationchange", onR);
      ro?.disconnect();
    };
  }, [desk]);

  useEffect(() => {
    if (film || !canRun3D()) return;
    let cancelled = false;
    const load = () =>
      import("./e-store-3d")
        .then((m) => !cancelled && setComp(() => m.EStore3D))
        .catch((err) => console.warn("[3d] chunk failed", err));
    const go = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 1500 });
      else setTimeout(load, 200);
    };
    // povratak: chunk je već u memoriji → odmah (bez čekanja na load/idle)
    if (back) load();
    else if (document.readyState === "complete") setTimeout(go, 150);
    else window.addEventListener("load", () => setTimeout(go, 150), { once: true });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready && !revealed) setRevealed(true);
  }, [ready, revealed]);
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setTwoD(false), 750);
    return () => clearTimeout(t);
  }, [revealed]);

  const onFirstFrame = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => {
    setComp(null);
    setReady(false);
    setRevealed(false);
    setTwoD(true);
  }, []);
  const onActive = useCallback(
    (i: number) => {
      setActive(i);
      try {
        if (items[i]) sessionStorage.setItem(F_HERO_KEY, items[i].slug);
      } catch {
        /* bez pohrane */
      }
    },
    [items]
  );

  /* ---------- kopija scene (za prijelaz i povratak) ---------- */

  const measure = useCallback(
    (i: number, on: boolean): Proxy | null => {
      const it = items[i];
      if (!it || it.img.kind !== "dres") return null;
      const sec = sceneRef.current?.getBoundingClientRect();
      if (!sec) return null;
      const r = revealed ? control.current?.rect(i) : null;
      // bez 3D: približno mjesto dresa na 2D šipki (samo za povratak — tada se dijelovi pretope)
      const jersey = r
        ? { left: r.left, top: r.top, width: r.width, height: r.height }
        : (() => {
            const w = sec.width * (desk ? 0.2 : 0.56);
            const h = w / 0.72;
            return { left: sec.left + (sec.width - w) / 2, top: sec.top + (desk ? 150 : E_NAV_H_M + 48), width: w, height: h };
          })();
      const nb = revealed ? control.current?.nameBox() : null;
      return {
        slug: it.slug,
        img: it.img.back,
        jersey,
        name: nb ? { cx: nb.cx, cy: nb.cy, font: nb.font, text: nb.name } : null,
        railY: revealed ? control.current?.railY() ?? null : null,
        on,
      };
    },
    [items, revealed, desk]
  );

  // skrivena kopija prati dres u fokusu (meta za povratak sa stranice dresa)
  useEffect(() => {
    if (opening.current) return;
    return afterIdle(
      control,
      () => {
        if (poster.current) return; // poster pri povratku drži točno mjesto dok se 3D ne pokaže
        setProxy(measure(active, false));
      },
      revealed ? 420 : 60
    );
  }, [active, revealed, measure, sceneH]);

  // stranica dresa u fokusu se unaprijed dohvati (prijelaz bez praznog kadra) — ne dok prsten vrti auto-okret
  // (svakih ~3.4 s novi dres → bespotreban promet); tada se dohvaća tek kad korisnik dođe do gumba (prefetchHref)
  useEffect(() => {
    const it = items[active];
    if (!it) return;
    return afterIdle(
      control,
      () => {
        if (control.current?.autoplay?.()) return;
        router.prefetch(withQ(`${F_BASE}/dres/${it.slug}/`));
      },
      250
    );
  }, [active, items, router]);
  const prefetchHref = useCallback((slug: string) => router.prefetch(withQ(`${F_BASE}/dres/${slug}/`)), [router]);

  const openItem = useCallback(
    (slug: string) => {
      const href = withQ(`${F_BASE}/dres/${slug}/`);
      const i = items.findIndex((it) => it.slug === slug);
      const p = i >= 0 ? measure(i, true) : null;
      if (!p || opening.current) {
        router.push(href);
        return;
      }
      opening.current = true;
      setProxy(p);
      try {
        sessionStorage.setItem(F_RET_KEY, JSON.stringify({ ...p, on: false, vw: window.innerWidth, vh: window.innerHeight }));
      } catch {
        /* bez pohrane */
      }
      const img = new Image();
      img.src = p.img;
      const decoded = Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 350))]);
      void decoded.then(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const el = proxyRef.current;
            if (!el) {
              router.push(href);
              return;
            }
            document.documentElement.classList.add("f-hero-vt");
            window.setTimeout(() => document.documentElement.classList.remove("f-hero-vt"), 1400);
            // "YAMAL. BROJ 19." je ispod scene (izvan kopije) → ime prijelaza ručno
            const over = overRef.current;
            over?.style.setProperty("view-transition-name", "ime-over");
            window.setTimeout(() => over?.style.removeProperty("view-transition-name"), 1500);
            openProduct(router, href, slug, el);
            // ako se stranica ne promijeni (npr. otkazano), kopija se sakrije
            window.setTimeout(() => {
              opening.current = false;
              setProxy((q) => (q ? { ...q, on: false } : q));
            }, 2500);
          })
        )
      );
    },
    [items, measure, router]
  );

  const n = items.length;
  const step = useCallback(
    (dir: number) => {
      if (!n) return;
      if (control.current && revealed) control.current.goBy(dir);
      else setActive((a) => (a + dir + n) % n);
    },
    [n, revealed]
  );
  const go = useCallback(
    (i: number) => {
      if (!n) return;
      if (control.current && revealed) control.current.goTo(i);
      else setActive(i);
    },
    [n, revealed]
  );

  // Tipkovnica: ← → listaju šipku dok je scena na ekranu (ne dok se piše u polje).
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.getAttribute("role") === "slider")) return;
      if (window.scrollY > sceneH * 0.6) return;
      e.preventDefault();
      step(e.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [step, sceneH]);

  const item = items[Math.min(active, Math.max(0, n - 1))];
  const labelAt = useCallback(
    (i: number) => {
      const it = items[i];
      return it ? surnames[i] || displayName(it).title : "";
    },
    [items, surnames]
  );

  return (
    <>
      {title ? null : <h1 className="sr-only">{tx.h1}</h1>}

      <section aria-label={tx.rail} className="relative">
        <style dangerouslySetInnerHTML={{ __html: SCENE_CSS }} />
        <div ref={sceneRef} className="eh-scene relative overflow-hidden bg-[#0a0a0a]" style={fitted ? { height: sceneH } : undefined}>
          {film && Hero ? (
            <Hero
              list={items}
              sceneH={sceneH}
              desk={desk}
              startIndex={start}
              control={control}
              onActive={onActive}
              onOpenItem={openItem}
              onFirstFrame={onFirstFrame}
              surnameOf={surnameOf}
              skipIntro={back}
              top={desk ? E_NAV_H + 8 : E_NAV_H_M + 4}
              hemLimit={desk ? sceneH - 175 : sceneH - M_OVER - M_FLOOR}
              floorPad={desk ? 0 : M_OVER + M_FLOOR - 38}
              ssrFrame={SSR_FRAME}
            />
          ) : null}
          {!film && Comp ? (
            <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 700ms ease", pointerEvents: revealed ? undefined : "none" }} aria-hidden={!revealed || undefined}>
              <Comp
                list={items}
                sceneH={sceneH}
                revealed={revealed}
                productHref={(s) => `${F_BASE}/dres/${s}/`}
                onOpenItem={openItem}
                onFirstFrame={onFirstFrame}
                onFail={onFail}
                onActive={onActive}
                control={control}
                wall={wall}
                surnameOf={surnameOf}
                startIndex={start}
              />
            </div>
          ) : null}
          {twoD ? (
            <div
              aria-hidden={revealed || undefined}
              className="f-2d absolute inset-x-0 flex items-center overflow-hidden"
              style={{ top: desk ? 120 : E_NAV_H_M + 40, bottom: desk ? 200 : 24, opacity: revealed ? 0 : 1, transition: "opacity 700ms ease", pointerEvents: revealed ? "none" : undefined }}
            >
              <div className="w-full">
                <OrmarGRail items={items} reduced={false} takenSlug={null} priorityFirst onOpen={(i) => items[i] && openItem(items[i].slug)} />
              </div>
            </div>
          ) : null}

          {/* vrh: tamni prijelaz ispod prozirne navigacije (gradijent, bez blura) */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[150px] bg-[linear-gradient(180deg,rgba(10,10,10,0.72)_0%,rgba(10,10,10,0.3)_55%,rgba(10,10,10,0)_100%)]" />

          {desk && n > 1 ? (
            <div className="contents max-lg:hidden">
              <EdgeArrow dir={-1} onClick={() => step(-1)} />
              <EdgeArrow dir={1} onClick={() => step(1)} />
            </div>
          ) : null}

          {desk ? (
            <div className="contents max-lg:hidden">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[230px] bg-[linear-gradient(180deg,rgba(10,10,10,0)_0%,rgba(10,10,10,0.38)_45%,rgba(10,10,10,0.82)_100%)]" />
              <div className="absolute inset-x-0 bottom-0">
                <FocusDesk item={item} index={active} total={n} onOpen={openItem} onIntent={prefetchHref} overRef={overRef} />
                <div className="mx-auto max-w-[1680px] px-12 pb-5">
                  <Scale total={n} index={active} onGo={go} labelAt={labelAt} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* mobitel: natpis je u SSR HTML-u (skriven CSS-om na računalu) → prvi ekran složen prije JS-a, bez naknadnog umetanja */}
        <div ref={infoRef} className="relative z-[1] lg:hidden" style={{ marginTop: -M_OVER }}>
          {/* pod se gasi tek ispod reda s cijenom (gumb uvijek na punoj tami) */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 bottom-0" style={{ background: `linear-gradient(180deg,rgba(10,10,10,0) 0px,rgba(10,10,10,0.28) 14px,rgba(10,10,10,0.8) 30px,#0a0a0a ${M_OVER}px)` }} />
          <FocusMobile item={item} index={active} total={n} onOpen={openItem} onIntent={prefetchHref} overRef={overRef} />
        </div>

        <HeroProxy ref={proxyRef} p={proxy} />
      </section>

      {title}

      {between}

      {/* prijelaz u katalog: oznaka poglavlja na hairline crti */}
      <section id="dresovi" data-ime-catalog aria-label={tx.catalog} className="scroll-mt-[72px] pb-24 pt-10 lg:pt-8">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-8">
          <div className="relative flex items-baseline gap-4 border-t border-[#ffffff14] pt-5">
            <span aria-hidden className="absolute -top-px left-0 h-px w-14 bg-[#e8ff3c]" />
            <span className="text-[12px] tabular-nums tracking-[0.06em] text-[#e8ff3c]">02</span>
            <h2 className="e-display text-[44px] text-white sm:text-[56px]">{tx.catalog}</h2>
          </div>
        </div>
        <div className="d-catalog e-cat mx-auto w-full max-w-[1280px] px-4 pt-2 sm:px-8 sm:pt-4">{children}</div>
      </section>
    </>
  );
}

/* ---------- kopija scene za prijelaz ---------- */

const RAIL_BG = "linear-gradient(180deg,#f3f3f5 0 25%,#55555a 25% 50%,#d9d9dc 50% 75%,#121216 75% 100%)";

const HeroProxy = forwardRef<HTMLDivElement, { p: Proxy | null }>(function HeroProxy({ p }, ref) {
  if (!p) return null;
  const j = p.jersey;
  return (
    <div ref={ref} aria-hidden data-ime-card={p.slug} data-proxy="" data-on={p.on} data-fade={p.fade || undefined} data-poster={p.poster || undefined} className="f-proxy pointer-events-none fixed inset-0 z-[45]">
      {p.name ? (
        <span
          data-vt="name"
          className="ime-outline absolute block whitespace-nowrap leading-[0.8]"
          style={{ left: p.name.cx, top: p.name.cy, fontSize: p.name.font, transform: "translate(-50%,-50%)" }}
        >
          {p.name.text}
        </span>
      ) : null}
      {p.railY != null ? <span data-vt="rail" className="absolute inset-x-0 h-[3px] -translate-y-1/2" style={{ top: p.railY, background: RAIL_BG }} /> : null}
      <div data-vt="jersey" className="absolute" style={{ left: j.left, top: j.top, width: j.width, height: j.height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt="" draggable={false} className="h-full w-full object-fill" />
      </div>
    </div>
  );
});

/* ---------- natpis ---------- */

function focusOf(item: OrmarRailItem | undefined) {
  if (!item) return null;
  const nm = displayName(item);
  const n = imeNames(item.product);
  const variant = eVariant(nm.variant);
  const kids = kidsOnly(item.product);
  return { surname: n.surname, number: n.number, meta: [n.club, variant].filter(Boolean).join(" · "), kids, price: ePrice(item.product.price) };
}

type FocusProps = {
  item: OrmarRailItem | undefined;
  index: number;
  total: number;
  onOpen: (slug: string) => void;
  /** korisnik ide prema gumbu (hover / dodir / fokus) → dohvati stranicu dresa (Link sam ne prefetcha: auto-okret) */
  onIntent: (slug: string) => void;
  overRef: RefObject<HTMLSpanElement>;
};

/* Prezime je već na zidu (projekcija ispod DRESIFY natpisa) → ovdje bez drugog naslova
   "PREZIME. BROJ N."; ostaje redni broj · klub, cijena i gumb (ime za čitače zaslona). */
function FocusDesk({ item, index, total, onOpen, onIntent }: FocusProps) {
  const t = useEText();
  const f = focusOf(item);
  if (!f || !item) return null;
  const href = `${F_BASE}/dres/${item.slug}/`;
  return (
    <div className="mx-auto flex max-w-[1680px] items-end justify-between gap-10 px-12 pb-7">
      <div className="min-w-0" aria-live="polite">
        <span className="sr-only">
          {f.surname}
          {f.number ? t.numberSr(f.number) : ""}
        </span>
        <p className="flex items-center gap-4 text-[13px] text-white/55">
          <span className="tabular-nums text-[#e8ff3c]">{pad(Math.min(index + 1, total))}</span>
          <span aria-hidden className="h-px w-8 bg-[linear-gradient(90deg,#e8ff3c,rgba(232,255,60,.12))]" />
          <span className="truncate">
            {f.meta}
            {f.kids ? <span className="text-white/85"> · {t.kidsOnly}</span> : null}
          </span>
        </p>
      </div>

      <div className="flex w-[300px] flex-col items-end">
        <p className="text-[40px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-[#e8ff3c]">{f.price}</p>
        <Link
          href={href}
          prefetch={false}
          onPointerEnter={() => onIntent(item.slug)}
          onFocus={() => onIntent(item.slug)}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            onOpen(item.slug);
          }}
          className="group mt-5 flex h-14 w-full items-center justify-between rounded-[6px] bg-[#e8ff3c] px-6 text-[15px] font-bold uppercase tracking-[0.06em] text-black shadow-[0_14px_36px_-12px_rgba(232,255,60,.7)] transition-colors duration-200 hover:bg-[#f2ff7a]"
        >
          {t.viewJersey}
          <ArrowRight strokeWidth={2} className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
        <p className="mt-3 text-[13px] text-white/50">{t.codLine}</p>
      </div>
    </div>
  );
}

/** mobitel: koliko natpis ulazi u scenu (red s cijenom na podu) i koliko poda ostaje između ruba dresa i natpisa */
const M_OVER = 40;
const M_FLOOR = 30;
/** mobitel: visina natpisa ispod scene (FocusMobile; izmjereno 130.75 px na 360–430 px širine) — za CSS visinu scene prije JS-a */
const M_INFO_H = 131;
/** kadar ploče prije JS-a: isti top / hemLimit kao props heroja (računalo / mobitel) */
const SSR_FRAME: OvalSsrFrame = { top: [E_NAV_H + 8, E_NAV_H_M + 4], hemPad: [175, M_OVER + M_FLOOR] };
/** Visina scene prije prvog mjerenja = ista formula kao fit (računalo: clamp(640, vh, 1240); mobitel: vidljiva visina
    − donja traka − natpis + preklop) → ploča i natpis stoje na mjestu kad JS preuzme (bez skoka, CLS ≈ 0). */
const SCENE_CSS =
  `.eh-scene{height:clamp(640px,100vh,1240px)}` +
  `@media (max-width:1023.98px){.eh-scene{height:max(400px,min(180vw,860px,calc(100vh - ${F_BNAV_H - M_OVER + 6 + M_INFO_H}px)))}` +
  `@supports (height:100svh){.eh-scene{height:max(400px,min(180vw,860px,calc(100svh - ${F_BNAV_H - M_OVER + 6 + M_INFO_H}px)))}}}`;

function FocusMobile({ item, index, total, onOpen, onIntent }: FocusProps) {
  const t = useEText();
  const f = focusOf(item);
  if (!f || !item) return null;
  const href = `${F_BASE}/dres/${item.slug}/`;
  const click = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpen(item.slug);
  };
  return (
    <div className="relative px-4 pb-3">
      <div aria-live="polite" className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="sr-only">
            {f.surname}
            {f.number ? t.numberSr(f.number) : ""}
          </span>
          <p className="flex items-center gap-3 text-[12.5px] text-white/55">
            <span className="tabular-nums text-[#e8ff3c]">{pad(Math.min(index + 1, total))}</span>
            <span aria-hidden className="h-px w-6 bg-[linear-gradient(90deg,#e8ff3c,rgba(232,255,60,.12))]" />
            <span className="truncate">
              {f.meta}
              {f.kids ? <span className="text-white/85"> · {t.kidsOnly}</span> : null}
            </span>
          </p>
        </div>
        <span className="shrink-0 pb-0.5 text-[24px] font-semibold leading-none tabular-nums text-[#e8ff3c]">{f.price}</span>
      </div>
      <Link
        href={href}
        prefetch={false}
        onTouchStart={() => onIntent(item.slug)}
        onPointerEnter={() => onIntent(item.slug)}
        onFocus={() => onIntent(item.slug)}
        onClick={click}
        className="mt-3 flex h-[52px] w-full items-center justify-between rounded-[6px] bg-[#e8ff3c] px-5 text-[14px] font-bold uppercase tracking-[0.06em] text-black shadow-[0_14px_36px_-12px_rgba(232,255,60,.7)] active:bg-[#d6ec2c]"
      >
        {t.viewJersey}
        <ArrowRight strokeWidth={2} className="h-5 w-5" />
      </Link>
      <p className="mt-2.5 text-center text-[12.5px] text-white/45">{t.codLine}</p>
    </div>
  );
}

/* Strelice na rubovima scene: gola ikona, bez kruga i okvira; velika ploha za klik. */
function EdgeArrow({ dir, onClick }: { dir: -1 | 1; onClick: () => void }) {
  const t = useEText();
  const Icon = dir < 0 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? t.prev : t.next}
      title={dir < 0 ? t.prevTitle : t.nextTitle}
      className={`group absolute top-[46%] z-10 flex h-28 w-16 -translate-y-1/2 items-center justify-center text-white/45 transition-colors duration-200 hover:text-white ${
        dir < 0 ? "left-5" : "right-5"
      }`}
    >
      <Icon strokeWidth={1} className={`h-11 w-11 transition-transform duration-300 ${dir < 0 ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
    </button>
  );
}

/** Skala (računalo): crtica po dresu na šipki — aktivna duža i neonska, svaka deseta malo
 *  duža. Hover pokaže broj i prezime, klik ili povlačenje skoči na dres. */
function Scale({ total, index, onGo, labelAt }: { total: number; index: number; onGo: (i: number) => void; labelAt: (i: number) => string }) {
  const t = useEText();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const last = useRef(-1);
  const [hover, setHover] = useState<number | null>(null);
  if (total < 2) return null;

  const at = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return 0;
    const t = Math.max(0, Math.min(0.9999, (clientX - r.left) / r.width));
    return Math.floor(t * total);
  };
  const jump = (i: number) => {
    if (i === last.current) return;
    last.current = i;
    onGo(i);
  };
  const ticks = Math.min(total, 400);

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={t.railPos}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={index + 1}
      aria-valuetext={`${t.of(index + 1, total)}: ${labelAt(index)}`}
      className="relative h-7 cursor-pointer touch-none select-none outline-none focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#ffffff40]"
      onPointerDown={(e) => {
        drag.current = true;
        last.current = -1;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        jump(at(e.clientX));
      }}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") setHover(at(e.clientX));
        if (drag.current) jump(at(e.clientX));
      }}
      onPointerUp={() => {
        drag.current = false;
      }}
      onPointerCancel={() => {
        drag.current = false;
      }}
      onPointerLeave={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          onGo((index + (e.key === "ArrowLeft" ? -1 : 1) + total) % total);
        } else if (e.key === "Home") {
          e.preventDefault();
          onGo(0);
        } else if (e.key === "End") {
          e.preventDefault();
          onGo(total - 1);
        }
      }}
    >
      {Array.from({ length: ticks }, (_, i) => {
        const on = i === index;
        const near = hover === i;
        return (
          <span
            key={i}
            aria-hidden
            className={`absolute bottom-[6px] w-px transition-[height,background-color] duration-200 ${
              on ? "h-[16px] bg-[#e8ff3c] shadow-[0_0_6px_rgba(232,255,60,.6)]" : near ? "h-[11px] bg-white" : i % 10 === 0 ? "h-[7px] bg-[#ffffff5c]" : "h-[4px] bg-[#ffffff2b]"
            }`}
            style={{ left: `${((i + 0.5) / ticks) * 100}%` }}
          />
        );
      })}
      {hover !== null && hover !== index ? (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[26px] -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-[#0a0a0a] px-2 py-1 text-[12px] tabular-nums text-white/85"
          style={{ left: `${((hover + 0.5) / ticks) * 100}%` }}
        >
          {pad(hover + 1)}
          <span className="ml-2 text-white/50">{labelAt(hover)}</span>
        </span>
      ) : null}
    </div>
  );
}
