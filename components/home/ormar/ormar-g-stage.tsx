"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "framer-motion";
import { Rotate3d } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import type { OrmarRailItem } from "@/lib/data/ormar-items";
import { OrmarGCard } from "./ormar-g-card";
import { PieceArt, PieceImage, RAIL_SIZES, pieces } from "./ormar-g-art";
import { HOOK_INNER, displayName, hasFront, isPair, itemAspect, mod, shortsOf } from "./ormar-g-lib";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const FLY = { type: "spring" as const, stiffness: 150, damping: 22, mass: 1 };
const FLIP = { type: "spring" as const, stiffness: 120, damping: 17, mass: 1 };
const RAIL_H = 5; // kratki komad šipke iznad skinute stavke
const PILL_SPACE = 50; // mjesto za gumb "Okreni" ispod dresa
const SHARP = "(max-width: 767px) 80vw, 520px";
const SHARP_PANTS = "(max-width: 767px) 45vw, 300px";
// Dječje hlačice na vlastitoj vješalici desno od dresa (udjeli visine okvira dresa h).
const SH_H = 0.6; // visina slike hlačica (kuka → dno)
const SH_HOOK = 7 / 700; // unutarnji vrh kuke na slici hlačica (izrez po rubu, 700 px)
const SH_GAP = 0.36; // od sredine dresa do lijevog ruba vješalice hlačica

type Props = {
  list: OrmarRailItem[];
  index: number;
  from: DOMRect | null; // okvir slike na šipki (isti omjer kao ovdje → let bez izobličenja)
  reduce: boolean;
  getRailRect: () => DOMRect | null;
  onIndex: (i: number) => void;
  onClosed: () => void;
};

// Skinuta stavka: dolazi sa šipke prema kupcu, a ispod (mobitel) ili desno (računalo) je
// kartica s veličinama. Dres se može okrenuti (leđa ↔ prednja) povlačenjem ili gumbom
// "Okreni"; trenirka pokazuje jaknu i hlače jednu do druge. Stranica iza je zamućena
// pravim "frosted glass" slojem.
export function OrmarGStage({ list, index, from, reduce, getRailRect, onIndex, onClosed }: Props) {
  const item = list[index];
  const aspect = itemAspect(item);
  const { isAddModalOpen } = useCart();
  const areaRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [shown, setShown] = useState(false); // pozadina (CSS prijelaz 200 ms)
  const closing = useRef(false);
  const flown = useRef(false);
  const dirRef = useRef(0);

  const fx = useMotionValue(0);
  const fy = useMotionValue(0);
  const fs = useMotionValue(1);
  const fop = useMotionValue(reduce || !from ? 0 : 1);
  const ui = useMotionValue(0); // kartica + komad šipke

  /* ---------- dječje hlačice (Djeca + postoji slika hlačica) ---------- */
  const shortsSrc = shortsOf(item);
  const [seg, setSeg] = useState<{ slug: string; kid: boolean } | null>(null);
  const [badShorts, setBadShorts] = useState<string | null>(null);
  const [shAspect, setShAspect] = useState(0.62);
  const onSegment = useCallback((s: "adult" | "kid") => setSeg({ slug: item.slug, kid: s === "kid" }), [item.slug]);
  const showShorts = Boolean(shortsSrc) && badShorts !== shortsSrc && seg?.slug === item.slug && seg.kid;
  const sh = useMotionValue(0); // 0 = skrivene iza dresa, 1 = na svojoj vješalici

  // Dres s prednjom fotografijom: ispod njega je gumb "Okreni" → rezerviraj mjesto.
  const reserve = hasFront(item) ? PILL_SPACE : 0;
  const measure = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const h = Math.max(140, Math.min(r.height - reserve, (r.width * 0.94) / aspect, 720));
    setBox((prev) => {
      const next = { w: Math.round(h * aspect), h: Math.round(h) };
      return prev && prev.w === next.w && prev.h === next.h ? prev : next;
    });
  }, [aspect, reserve]);

  useIsoLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (areaRef.current) ro.observe(areaRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Pozadina: idući kadar → CSS prijelaz opacity 0 → 1.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Otvaranje: let sa šipke.
  useIsoLayoutEffect(() => {
    if (!box || flown.current) return;
    flown.current = true;
    animate(ui, 1, { duration: reduce ? 0 : 0.32, ease: "easeOut" });
    const area = areaRef.current?.getBoundingClientRect();
    if (!from || !area || reduce) {
      animate(fop, 1, { duration: reduce ? 0 : 0.3 });
      return;
    }
    fx.set(from.left + from.width / 2 - (area.left + area.width / 2));
    fy.set(from.top + from.height / 2 - (area.top + box.h / 2));
    fs.set(from.width / box.w);
    animate(fx, 0, FLY);
    animate(fy, 0, FLY);
    animate(fs, 1, FLY);
  }, [box]);

  // Hlačice: klize iza dresa na svoju vješalicu (Djeca) i natrag (Odrasli / drugi proizvod).
  const shSlug = useRef(item.slug);
  useEffect(() => {
    if (shSlug.current !== item.slug) {
      shSlug.current = item.slug;
      sh.stop();
      sh.set(0);
    }
    if (closing.current) return;
    const to = showShorts ? 1 : 0;
    if (reduce) sh.set(to);
    else animate(sh, to, { type: "spring", stiffness: 130, damping: 21, mass: 1 });
  }, [showShorts, item.slug, reduce, sh]);

  // Fokus u dijalog (pristupačnost) — bez skrolanja.
  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, []);

  /* ---------- okretanje (leđa ↔ prednja) ---------- */
  const canFlip = hasFront(item);
  const rot = useMotionValue(0);
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const [front, setFront] = useState(false);
  const applyFaces = useCallback((v: number) => {
    const a = mod(v, 360);
    const showFront = a > 90 && a < 270;
    // WebKit ponekad ignorira backface-visibility na slikama → izričito sakrij stražnju plohu.
    if (backRef.current) backRef.current.style.visibility = showFront ? "hidden" : "visible";
    if (frontRef.current) frontRef.current.style.visibility = showFront ? "visible" : "hidden";
    setFront((prev) => (prev === showFront ? prev : showFront));
  }, []);
  useMotionValueEvent(rot, "change", applyFaces);

  const flipTo = useCallback(
    (target: number, velocity = 0) => {
      if (reduce) {
        rot.set(target);
        applyFaces(target);
        return;
      }
      animate(rot, target, { ...FLIP, velocity });
    },
    [applyFaces, reduce, rot]
  );
  const flip = useCallback(() => {
    const cur = rot.get();
    flipTo((Math.round(cur / 180) + 1) * 180);
  }, [flipTo, rot]);

  const fd = useRef({ id: -1, x0: 0, y0: 0, r0: 0, on: false, t: 0, v: 0, lx: 0 });
  const onFlipDown = (e: React.PointerEvent) => {
    if (!canFlip || e.button !== 0) return;
    rot.stop();
    fd.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, r0: rot.get(), on: false, t: performance.now(), v: 0, lx: e.clientX };
  };
  const onFlipMove = (e: React.PointerEvent) => {
    const d = fd.current;
    if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.on) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - d.y0)) {
        d.on = true;
        d.x0 = e.clientX;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      }
      return;
    }
    const now = performance.now();
    const dt = Math.max(1, now - d.t);
    d.v = d.v * 0.5 + (((e.clientX - d.lx) * 0.6) / dt) * 1000 * 0.5;
    d.t = now;
    d.lx = e.clientX;
    rot.set(d.r0 + (e.clientX - d.x0) * 0.6);
  };
  const onFlipUp = (e: React.PointerEvent) => {
    const d = fd.current;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    if (!d.on) return;
    d.on = false;
    const v = performance.now() - d.t > 90 ? 0 : Math.max(-1400, Math.min(1400, d.v));
    const cur = rot.get();
    const projected = cur + v * 0.12;
    // Najviše pola okreta dalje od početka povlačenja (jedan "korak").
    const base = Math.round(d.r0 / 180) * 180;
    const target = Math.max(base - 180, Math.min(base + 180, Math.round(projected / 180) * 180));
    flipTo(target, v);
  };

  // Prethodni / sljedeći: kratki klizni prijelaz (i nazad na leđa).
  const prevIndex = useRef(index);
  useEffect(() => {
    if (prevIndex.current === index) return;
    prevIndex.current = index;
    rot.stop();
    rot.set(0);
    applyFaces(0);
    if (reduce) return;
    fx.set(dirRef.current * 60);
    fop.set(0);
    animate(fx, 0, { type: "spring", stiffness: 220, damping: 28 });
    animate(fop, 1, { duration: 0.22 });
  }, [index, reduce, fx, fop, rot, applyFaces]);

  const go = useCallback((d: number) => {
    if (closing.current) return;
    dirRef.current = d;
    onIndex((index + d + list.length) % list.length);
  }, [index, list.length, onIndex]);

  const close = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    sh.stop();
    animate(sh, 0, { duration: reduce ? 0 : 0.22, ease: "easeOut" });
    // Na šipci vise leđa → okreni nazad dok leti.
    const r = rot.get();
    if (mod(r, 360) !== 0) flipTo(Math.round(r / 360) * 360);
    const target = getRailRect();
    const area = areaRef.current?.getBoundingClientRect();
    const visible = target && area && box && target.bottom > 0 && target.top < window.innerHeight;
    const anims: { then: (fn: () => void) => unknown }[] = [animate(ui, 0, { duration: reduce ? 0 : 0.24 })];
    if (visible && !reduce) {
      const opts = { type: "spring" as const, stiffness: 170, damping: 26 };
      anims.push(animate(fx, target.left + target.width / 2 - (area.left + area.width / 2), opts));
      anims.push(animate(fy, target.top + target.height / 2 - (area.top + box.h / 2), opts));
      anims.push(animate(fs, target.width / box.w, opts));
    } else {
      anims.push(animate(fop, 0, { duration: reduce ? 0 : 0.22 }));
    }
    const all = Promise.all(anims.map((a) => new Promise<void>((res) => { a.then(() => res()); })));
    await Promise.race([all, new Promise((res) => setTimeout(res, reduce ? 50 : visible ? 850 : 350))]);
    onClosed();
  }, [box, flipTo, fs, fx, fy, fop, getRailRect, onClosed, reduce, rot, ui, sh]);

  // Tipkovnica + zaključavanje skrolanja stranice.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isAddModalOpen) return; // Esc tada zatvara prozor košarice
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, go, isAddModalOpen]);
  useEffect(() => {
    // html ima overflow-x: clip (globals.css) → overflow na body se ne prenosi na prozor, pa
    // zaključaj i <html> (inače se stranica iza skrola prstom / kotačićem).
    const html = document.documentElement;
    const prev = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      html.style.overflow = prevHtml;
    };
  }, []);
  // Prozor "Dodano u košaricu" pri zatvaranju vraća overflow na "" (efekt u CartProvideru
  // radi nakon našeg) → ponovno zaključaj skrolanje dok je kartica još otvorena.
  useEffect(() => {
    if (isAddModalOpen) return;
    const id = requestAnimationFrame(() => { document.body.style.overflow = "hidden"; });
    return () => cancelAnimationFrame(id);
  }, [isAddModalOpen]);

  const { title } = displayName(item);
  const pair = isPair(item);
  const hookY = box ? HOOK_INNER * box.h : 0;

  // Raspored dres + hlačice: kompozicija se pomakne ulijevo i (uski ekran) malo smanji da obje stanu.
  const shH = box ? box.h * SH_H : 0;
  const shW = shH * shAspect;
  const shDx = box ? box.h * SH_GAP + shW / 2 : 0; // kuka hlačica od sredine dresa
  const compW = box ? box.w / 2 + shDx + shW / 2 : 1;
  const compOff = box ? (shDx + shW / 2 - box.w / 2) / 2 : 0;
  const areaW = areaRef.current?.clientWidth ?? compW;
  const fit = Math.min(1, (areaW * 0.97) / compW);
  const cScale = useTransform(sh, (v) => 1 - v * (1 - fit));
  const cX = useTransform(sh, (v) => -v * compOff * fit);
  const shX = useTransform(sh, (v) => -(1 - v) * shDx);
  const shOp = useTransform(sh, (v) => Math.min(1, v * 2.2));
  const shScale = useTransform(sh, (v) => 0.9 + 0.1 * v);
  const railBase = pair ? (box?.w ?? 0) * 1.35 : Math.min((box?.w ?? 0) * 1.5, 560);
  const railW = useTransform(sh, (v) => railBase + v * shDx * 1.2);
  const railShift = useTransform(sh, (v) => v * shDx * 0.5); // šipka se produži prema hlačicama

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[45] touch-none overscroll-contain outline-none" role="dialog" aria-modal="true" aria-label={`${pair ? "Trenirka" : "Dres"}: ${title}`}>
      <style>{`.og-frost{background:rgba(10,10,10,.8);opacity:0;transition:opacity .2s ease-out}.og-frost.og-on{opacity:1}@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.og-frost{background:rgba(10,10,10,.64);-webkit-backdrop-filter:blur(16px) saturate(110%);backdrop-filter:blur(16px) saturate(110%)}}.og-pill{background:rgba(24,24,26,.78)}@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.og-pill{background:rgba(24,24,26,.5);-webkit-backdrop-filter:blur(12px) saturate(140%);backdrop-filter:blur(12px) saturate(140%)}}@media (prefers-reduced-motion:reduce){.og-frost{transition:none}}`}</style>
      {/* Pozadina: pravo matirano staklo preko stranice */}
      <div className={`og-frost absolute inset-0 ${shown ? "og-on" : ""}`} onClick={close} aria-hidden="true" />

      <div className="pointer-events-none relative mx-auto flex h-full max-w-[1180px] flex-col px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] md:flex-row md:items-center md:gap-14 md:px-8 md:py-10">
        <div className="relative min-h-0 flex-1 md:h-[80vh]">
          <div ref={areaRef} className="absolute inset-x-0 bottom-1 top-3 md:bottom-6 md:top-8">
            {box && (
              <>
                {/* Kompozicija na komadu šipke: dres (+ dječje hlačice desno) */}
                <motion.div className="absolute inset-0" style={{ x: cX, scale: cScale, transformOrigin: `50% ${hookY}px` }}>
                  {/* Kratki komad šipke kroz kuku */}
                  <motion.div
                    className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-full bg-[linear-gradient(180deg,#f7f8f9_0%,#c5c8cc_35%,#6f7277_70%,#2f3134_100%)] "
                    style={{
                      opacity: ui,
                      top: hookY,
                      height: RAIL_H,
                      width: railW,
                      marginLeft: railShift,
                      // Par: obje kuke (jakna ~0.4, hlače ~0.8 širine) moraju biti na punoj šipki.
                      WebkitMaskImage: `linear-gradient(90deg,transparent,#000 ${pair ? 16 : 30}%,#000 ${pair ? 84 : 70}%,transparent)`,
                      maskImage: `linear-gradient(90deg,transparent,#000 ${pair ? 16 : 30}%,#000 ${pair ? 84 : 70}%,transparent)`,
                    }}
                  />
                  {/* Kontaktna sjena */}
                  <motion.div
                    className="absolute left-1/2 h-10 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.75),transparent_70%)]"
                    style={{ opacity: ui, width: box.w * 0.8, top: box.h - 16 }}
                  />

                  {/* Dječje hlačice na svojoj vješalici: iza dresa, kližu udesno kad je odabrano "Djeca" */}
                  {shortsSrc && badShorts !== shortsSrc && (
                    <motion.div
                      aria-hidden={!showShorts || undefined}
                      className="pointer-events-none absolute left-1/2"
                      style={{ top: hookY - SH_HOOK * shH, marginLeft: shDx - shW / 2, height: shH, x: shX, opacity: shOp, scale: shScale, transformOrigin: "50% 0%" }}
                    >
                      <div
                        className="absolute left-1/2 h-8 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.65),transparent_70%)]"
                        style={{ width: shW * 0.9, top: shH - 12 }}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={shortsSrc}
                        src={shortsSrc}
                        alt={`${title} — dječje hlačice na vješalici`}
                        draggable={false}
                        decoding="async"
                        className="relative block h-full w-auto max-w-none select-none"
                        onLoad={(e) => {
                          const im = e.currentTarget;
                          if (im.naturalWidth && im.naturalHeight) setShAspect(im.naturalWidth / im.naturalHeight);
                        }}
                        onError={() => setBadShorts(shortsSrc)}
                      />
                    </motion.div>
                  )}

                  <motion.div
                    className="pointer-events-auto absolute left-1/2 top-0 select-none"
                    style={{ width: box.w, height: box.h, marginLeft: -box.w / 2, x: fx, y: fy, scale: fs, opacity: fop, perspective: 1400 }}
                  >
                    {canFlip && item.img.kind === "dres" && item.img.front ? (
                      <Flipper
                        rot={rot}
                        backRef={backRef}
                        frontRef={frontRef}
                        handlers={{ onPointerDown: onFlipDown, onPointerMove: onFlipMove, onPointerUp: onFlipUp, onPointerCancel: onFlipUp }}
                        back={<Face src={item.img.back} sizes={RAIL_SIZES.dres} alt={`${title} — leđa dresa na vješalici`} k={item.slug} />}
                        front={<Face src={item.img.front} alt={`${title} — prednja strana dresa na vješalici`} k={`${item.slug}-f`} />}
                      />
                    ) : (
                      pieces(item, box.h).map((pc) => {
                        const jf = pc.key === "jakna" && canFlip && item.img.kind === "trenirka" ? item.img.jaknaFront : undefined;
                        return (
                          <div key={`${item.slug}-${pc.key}`} className="absolute top-0" style={{ left: pc.left, width: pc.width, height: box.h, perspective: jf ? 1400 : undefined }}>
                            {jf ? (
                              // Jakna se okreće (leđa ↔ prednja), hlače ostaju
                              <Flipper
                                rot={rot}
                                backRef={backRef}
                                frontRef={frontRef}
                                handlers={{ onPointerDown: onFlipDown, onPointerMove: onFlipMove, onPointerUp: onFlipUp, onPointerCancel: onFlipUp }}
                                back={<Face src={pc.src} sizes={RAIL_SIZES.jakna} alt={pc.alt} k={`${item.slug}-jakna`} />}
                                front={<Face src={jf} alt={`${title} — prednja strana jakne na vješalici`} k={`${item.slug}-jakna-f`} />}
                              />
                            ) : (
                              <PieceArt pc={pc} h={box.h}>
                                <Face src={pc.src} sizes={RAIL_SIZES[pc.key]} sharp={pc.key === "hlace" ? SHARP_PANTS : SHARP} alt={pc.alt} k={`${item.slug}-${pc.key}`} />
                              </PieceArt>
                            )}
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                </motion.div>

                {/* Okreni: leđa ↔ prednja (samo kad postoji prednja fotografija) */}
                {canFlip && (
                  <motion.div className="absolute inset-x-0 flex justify-center" style={{ opacity: ui, top: box.h + 8, x: cX }}>
                    <button
                      type="button"
                      onClick={flip}
                      aria-label={front ? "Okreni na leđa" : "Okreni na prednju stranu"}
                      className="og-pill pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.12] pl-3 pr-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_30px_-10px_rgba(0,0,0,0.9)] transition hover:border-white/30 active:scale-[0.97]"
                    >
                      <Rotate3d strokeWidth={1.5} className="h-4 w-4 text-white/70" />
                      <span aria-live="polite">{front ? "Prednja strana" : "Leđa"}</span>
                      <span className="h-3 w-px bg-white/20" aria-hidden />
                      <span className="text-white/55">Okreni</span>
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>

        <motion.div className="pointer-events-auto mt-3 shrink-0 md:mt-0 md:w-[420px]" style={{ opacity: ui }}>
          <OrmarGCard key={item.slug} item={item} index={index} total={list.length} onBack={close} onPrev={() => go(-1)} onNext={() => go(1)} onSegment={onSegment} />
        </motion.div>
      </div>
    </div>
  );
}

// Okretna ploha (leđa ↔ prednja): dres cijeli, kod trenirke samo jakna.
function Flipper({
  rot,
  backRef,
  frontRef,
  handlers,
  back,
  front,
}: {
  rot: ReturnType<typeof useMotionValue<number>>;
  backRef: React.RefObject<HTMLDivElement>;
  frontRef: React.RefObject<HTMLDivElement>;
  handlers: Pick<React.HTMLAttributes<HTMLDivElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;
  back: React.ReactNode;
  front: React.ReactNode;
}) {
  return (
    <motion.div className="absolute inset-0 touch-pan-y" style={{ rotateY: rot, transformStyle: "preserve-3d", cursor: "grab" }} {...handlers}>
      <div ref={backRef} className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
        {back}
      </div>
      <div
        ref={frontRef}
        className="absolute inset-0"
        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", visibility: "hidden" }}
      >
        {front}
      </div>
    </motion.div>
  );
}

// Slika na vješalici: ista varijanta kao na šipki (već u predmemoriji → vidljiva odmah u letu),
// a oštrija preko nje stigne odmah zatim.
function Face({ src, alt, sizes, sharp = SHARP, k }: { src: string; alt: string; sizes?: string; sharp?: string; k: string }) {
  return (
    <>
      {sizes && (
        <span aria-hidden className="absolute inset-0" key={`r-${k}`}>
          <PieceImage src={src} alt="" sizes={sizes} eager />
        </span>
      )}
      <span className="absolute inset-0" key={k}>
        <PieceImage src={src} alt={alt} sizes={sharp} eager />
      </span>
    </>
  );
}
