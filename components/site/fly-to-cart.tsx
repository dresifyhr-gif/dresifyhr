"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import type { CartItem } from "@/components/providers/cart-provider";
import type { HangerImages } from "@/lib/data/ormar-hanger";
import { mixImage, type MixKind } from "@/lib/mix";

/* ------------------------------------------------------------------ */
/*  "Let u košaricu" — nakon uspješnog dodavanja mali izrezak proizvoda */
/*  (vješalica ako postoji, inače fotografija; lopta/kapa za mix) leti   */
/*  balističkim lukom (gravitacija, lagana rotacija, smanjivanje) u      */
/*  ikonu košarice; ikona se "pod težinom" ugne, značka otkuca broj.     */
/*                                                                      */
/*  - Jedan globalni slušač: cart-provider šalje CART_ADD_EVENT.         */
/*  - Samo transform/opacity preko WAAPI (radi na kompozitoru, i kad je  */
/*    glavna nit zauzeta renderiranjem prozora "Dodano").                */
/*  - Fiksni sloj s pointer-events:none → nema pomaka rasporeda.         */
/*  - Smanjeni pokreti / nema mete / nema slike → bez leta, broj odmah.  */
/*  - Prozor "Dodano" i ladica čekaju slijetanje (useCartFlying).        */
/* ------------------------------------------------------------------ */

// useLayoutEffect bez upozorenja pri SSR-u (React 18).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const CART_ADD_EVENT = "dresify:cart-add";
const FLY_EVENT = "dresify:cart-fly"; // let krenuo (značka zadrži stari broj)
const LAND_EVENT = "dresify:cart-land"; // udar u ikonu (značka otkuca, ikona se ugne)

export type CartAddDetail = { item: CartItem; fromCart: boolean };

/** Za cart-provider: javi uspješno dodavanje (samo događaj — bez utjecaja na podatke). */
export function emitCartAdd(detail: CartAddDetail) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<CartAddDetail>(CART_ADD_EVENT, { detail }));
  } catch {
    /* animacija nikad ne smije srušiti dodavanje */
  }
}

/* ---------------- Stanje "u letu" (prozor/ladica čekaju) ---------------- */

let flyingUntil = 0;
let flyingTimer: ReturnType<typeof setTimeout> | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());
const isFlying = () => flyingUntil > 0;

/* cart-provider pri otvaranju prozora/ladice stavlja body{overflow:hidden}; uz html{overflow-x:clip}
   body tada postaje vlastiti spremnik pomicanja i ljepljivo zaglavlje (s ikonom košarice!)
   odjaše s ekrana (i cijela se stranica preračuna baš u trenutku otvaranja). Dok proizvod leti
   i dok je prozor/ladica otvorena, vraćamo vrijednosti iz globals.css — pomicanje ionako
   zaključava list (useScrollLock, bez diranja overflowa). Brojač razloga: let + prozor. */
let unpin: HTMLStyleElement | null = null;
const pinReasons = new Set<string>();
function keepHeader(reason: string, on: boolean) {
  if (on) pinReasons.add(reason);
  else pinReasons.delete(reason);
  if (pinReasons.size && !unpin) {
    unpin = document.createElement("style");
    unpin.setAttribute("data-fly-keep-header", "");
    unpin.textContent = "@supports (overflow: clip){body{overflow-x:clip!important;overflow-y:visible!important}}";
    document.head.appendChild(unpin);
  } else if (!pinReasons.size && unpin) {
    unpin.remove();
    unpin = null;
  }
}

/** Dok je prozor "Dodano" / ladica otvorena: zaglavlje ostaje na mjestu (vidi keepHeader). */
export function useKeepHeader(on: boolean) {
  useIsoLayoutEffect(() => {
    if (!on) return;
    keepHeader("overlay", true);
    return () => keepHeader("overlay", false);
  }, [on]);
}

function holdOverlays(ms: number) {
  flyingUntil = ms > 0 ? Date.now() + ms : 0;
  if (flyingTimer) clearTimeout(flyingTimer);
  flyingTimer = null;
  keepHeader("fly", ms > 0);
  if (ms > 0) {
    flyingTimer = setTimeout(() => {
      flyingUntil = 0;
      flyingTimer = null;
      keepHeader("fly", false);
      notify();
    }, ms);
  }
  notify();
}

/** true dok proizvod leti — prozor "Dodano" / ladica se otvaraju tek nakon slijetanja. */
export function useCartFlying() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    isFlying,
    () => false
  );
}

/* ---------------- Fizika ---------------- */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Prigušena opruga, odziv na udarac (kreće iz 0, vraća se u 0). Normirano na vrh = 1. */
function impulse(t: number, freq: number, zeta: number) {
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const tPeak = Math.atan(wd / (zeta * w)) / wd;
  const f = (x: number) => Math.exp(-zeta * w * x) * Math.sin(wd * x);
  return f(t) / f(tPeak);
}

/** Prigušena opruga, odziv na skok (0 → 1 uz mali prebačaj). */
function step(t: number, freq: number, zeta: number) {
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}

type Pt = { x: number; y: number };

/**
 * Balistički luk od A do B: stalna gravitacija, vrh luka malo iznad više točke,
 * vodoravno bez otpora (linearno u vremenu) — kao predmet bačen u vrećicu.
 */
function ballistic(a: Pt, b: Pt) {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  // Meta ispod (donja traka): bacanje u luku pa pad u vrećicu.
  // Meta iznad (zaglavlje): hitac uvis kojem je vrh tik iznad ikone — usporava i "upadne" odozgo.
  const lift = b.y < a.y ? clamp(dist * 0.025, 6, 16) : clamp(dist * 0.2, 48, 150);
  const hi = Math.min(a.y, b.y);
  // vrh luka ostaje na ekranu (ikona u zaglavlju je pri samom vrhu)
  const top = Math.min(hi - 10, Math.max(6, hi - lift));
  const ra = Math.sqrt(a.y - top);
  const rb = Math.sqrt(b.y - top);
  const T = clamp(0.5 + dist / 3200, 0.56, 0.72); // s
  const tApex = (T * ra) / (ra + rb);
  const g = (2 * (a.y - top)) / (tApex * tApex);
  return {
    T,
    at: (t: number): Pt => ({ x: lerp(a.x, b.x, t / T), y: top + 0.5 * g * (t - tApex) * (t - tApex) })
  };
}

type Flight = {
  el: HTMLElement;
  from: Pt;
  to: Pt;
  w: number;
  h: number;
  endSize: number; // px (najveća dimenzija) u trenutku ulaska u ikonu
  delay: number; // ms
  spin: number; // stupnjevi ukupno
};

/** Uzorkovani ključni okviri (linearno među uzorcima = vjerna putanja na kompozitoru). */
function flightKeyframes(f: Flight) {
  const path = ballistic(f.from, f.to);
  const N = 44;
  const s0 = 1;
  const s1 = f.endSize / Math.max(f.w, f.h);
  const frames: Keyframe[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const t = u * path.T;
    const p = path.at(t);
    // podizanje: kratko "uzmi u ruku" (+5 %), pa se udaljava prema ikoni sve brže
    const pick = 0.05 * Math.sin(Math.min(1, u / 0.22) * Math.PI) * (u < 0.22 ? 1 : 0);
    // velik izrezak se odmah počne udaljavati (dubina), mali dugo ostaje čitljiv
    const shrink = Math.pow(u, lerp(1.55, 0.62, clamp((Math.max(f.w, f.h) - 110) / 260, 0, 1)));
    const s = lerp(s0, s1, shrink) + pick;
    const rot = f.spin * (1 - Math.pow(1 - u, 2)); // rotacija se smiruje (otpor zraka)
    const opacity = u < 0.86 ? 1 : lerp(1, 0, (u - 0.86) / 0.14);
    frames.push({
      offset: u,
      opacity,
      transform: `translate3d(${(p.x - f.w / 2).toFixed(2)}px, ${(p.y - f.h / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`
    });
  }
  return { frames, duration: path.T * 1000 };
}

/* ---------------- Mete (ikone košarice) ---------------- */

function visibleRect(el: Element) {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) return null;
  return r;
}

function findTarget(): { el: HTMLElement; at: Pt } | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]"));
  for (const el of els) {
    const r = visibleRect(el);
    if (!r) continue;
    // Ikona mora stvarno biti na vrhu (ne prekrivena sadržajem). Naši listovi (Sheet + zaslon)
    // koji se upravo zatvaraju nakon dodavanja (izbor veličine, mix) se ne broje; cjelozaslonske
    // pozornice (npr. ormar) se broje — tada nema leta, broj se odmah promijeni.
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const host = el.closest("button,a") ?? el;
    if (hit && !host.contains(hit) && !hit.closest(".fl-sheet,.overlay-scrim,[data-fly-layer]")) continue;
    // otvor vrećice je malo iznad sredine ikone
    return { el, at: { x: r.left + r.width / 2, y: r.top + r.height * 0.42 } };
  }
  return null;
}

/* ---------------- Izvor (odakle proizvod "polijeće") ---------------- */

let lastTap: { x: number; y: number; t: number } | null = null;

const srcOf = (img: HTMLImageElement) => {
  const s = img.currentSrc || img.src || "";
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const base = (p?: string) => (p ? p.split("/").pop()?.split("?")[0] ?? "" : "");

/** Najbliža vidljiva slika proizvoda na stranici (vješalica ima prednost). */
function findSourceImage(needles: string[], near: Pt | null) {
  const clean = needles.filter((n) => n && n.length > 3);
  if (!clean.length) return null;
  let best: { img: HTMLImageElement; rect: DOMRect; score: number } | null = null;
  for (const img of Array.from(document.images)) {
    if (!img.complete || !img.naturalWidth) continue;
    if (img.closest("[data-fly-layer]")) continue;
    const src = srcOf(img);
    if (!clean.some((n) => src.includes(n))) continue;
    const r = visibleRect(img);
    if (!r || r.width < 36 || r.height < 36) continue;
    const vis =
      (Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)) *
      (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    if (vis / (r.width * r.height) < 0.4) continue;
    const cv = (img as HTMLImageElement & { checkVisibility?: (o: object) => boolean }).checkVisibility;
    if (cv && !cv.call(img, { opacityProperty: true, visibilityProperty: true })) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = near ? Math.hypot(cx - near.x, cy - near.y) : 0;
    const score = d - (src.includes("/ormar/") ? 120 : 0);
    if (!best || score < best.score) best = { img, rect: r, score };
  }
  return best;
}

/* ---------------- Vješalice (lijeno) ---------------- */

let manifest: { h: Record<string, HangerImages>; k: Record<string, { image: string }> } | null = null;
let manifestLoading = false;
function loadManifest() {
  if (manifest || manifestLoading) return;
  manifestLoading = true;
  import("@/lib/data/ormar-hanger")
    .then((m) => {
      manifest = { h: m.HANGER_IMAGES, k: m.KOMPLET_IMAGES };
    })
    .catch(() => {})
    .finally(() => {
      manifestLoading = false;
    });
}

function hangerFor(slug: string) {
  const h = manifest?.h[slug];
  // Kompleti: jedna složena slika na vješalici.
  if (!h) return manifest?.k[slug]?.image;
  return h.kind === "dres" ? h.back ?? h.front : h.jakna ?? h.hlace;
}

const warmed = new Map<string, HTMLImageElement>();
function warm(src: string) {
  let img = warmed.get(src);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = src;
    warmed.set(src, img);
    if (warmed.size > 24) warmed.delete(warmed.keys().next().value as string);
  }
  return img;
}

/** Slika spremna (dekodirana) unutar `ms`, inače null. */
function ready(src: string, ms: number): Promise<HTMLImageElement | null> {
  const img = warm(src);
  if (img.complete && img.naturalWidth) return Promise.resolve(img);
  return new Promise((res) => {
    const timer = setTimeout(() => res(null), ms);
    img
      .decode()
      .then(() => {
        clearTimeout(timer);
        res(img);
      })
      .catch(() => {
        clearTimeout(timer);
        res(null);
      });
  });
}

/** Slug proizvoda ispod prsta (kartica s poveznicom /dres/… ili stranica dresa). */
function slugNear(target: EventTarget | null) {
  const el = target instanceof Element ? target : null;
  const a = el?.closest<HTMLAnchorElement>('a[href*="/dres/"]') ?? el?.closest("article,li")?.querySelector<HTMLAnchorElement>('a[href*="/dres/"]');
  const href = a?.getAttribute("href") ?? (location.pathname.startsWith("/dres/") ? location.pathname : "");
  const m = href.match(/\/dres\/([^/?#]+)/);
  return m?.[1];
}

/* ---------------- Sloj i letači ---------------- */

let layer: HTMLDivElement | null = null;
function getLayer() {
  if (layer && layer.isConnected) return layer;
  layer = document.createElement("div");
  layer.setAttribute("data-fly-layer", "");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "140",
    pointerEvents: "none",
    overflow: "hidden",
    contain: "strict"
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(layer);
  return layer;
}

function makeFlyer(src: string, w: number, h: number, kind: "cutout" | "photo") {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${w}px`,
    height: `${h}px`,
    willChange: "transform, opacity",
    transformOrigin: "50% 50%",
    opacity: "0",
    ...(kind === "photo"
      ? {
          // Rezervna slika: ista tamna "pločica" kao sličica u košarici (nikad bijela).
          background: "linear-gradient(180deg,#141414,#0a0a0a)",
          borderRadius: `${Math.round(Math.min(w, h) * 0.1)}px`,
          boxShadow: "0 18px 36px -14px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)",
          overflow: "hidden"
        }
      : {})
  } satisfies Partial<CSSStyleDeclaration>);
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.decoding = "sync";
  img.draggable = false;
  Object.assign(img.style, {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    ...(kind === "photo"
      ? { padding: "6%", boxSizing: "border-box" }
      : { filter: "drop-shadow(0 14px 14px rgba(0,0,0,0.5))" })
  } satisfies Partial<CSSStyleDeclaration>);
  el.appendChild(img);
  return el;
}

function fit(nw: number, nh: number, box: number) {
  const r = nw && nh ? nw / nh : 0.8;
  return r >= 1 ? { w: box, h: box / r } : { w: box * r, h: box };
}

/* ---------------- Udar u ikonu ---------------- */

function bounceTarget(el: HTMLElement, strength: number) {
  const N = 30;
  const D = 620;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * (D / 1000);
    const k = impulse(t, 4.2, 0.32) * strength;
    // pod težinom: dolje + spljošti, opruga vrati s malim odskokom
    frames.push({
      offset: i / N,
      transform: `translate3d(0, ${(3.2 * k).toFixed(2)}px, 0) scale(${(1 + 0.07 * k).toFixed(4)}, ${(1 - 0.11 * k).toFixed(4)})`
    });
  }
  el.style.transformOrigin = "50% 100%";
  el.animate(frames, { duration: D, easing: "linear" });
}

/* ---------------- Glavni slušač ---------------- */

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

async function launch(detail: CartAddDetail) {
  const { item } = detail;
  const target = findTarget();
  if (!target) return false;

  const tap = lastTap && performance.now() - lastTap.t < 3000 ? { x: lastTap.x, y: lastTap.y } : null;
  const hanger = hangerFor(item.slug);
  const needles = [hanger ? `/ormar/hanger/${item.slug}.` : "", hanger ? `/ormar/hanger-front/${item.slug}.` : "", hanger ?? "", base(item.imageSrc)];
  const found = findSourceImage(needles, tap);

  let src = "";
  let kind: "cutout" | "photo" = "cutout";
  let nat = { w: 0, h: 0 };
  // Polijeće s mjesta gdje je proizvod na zaslonu (slika u kartici/listu/galeriji), inače s prsta.
  const center: Pt = found
    ? { x: found.rect.left + found.rect.width / 2, y: found.rect.top + found.rect.height / 2 }
    : tap ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.55 };
  const box = 104;

  // Izrezak na vješalici ima prednost: onaj koji je već na ekranu (ista strana, bez skoka slike),
  // inače onaj iz manifesta (zagrijan pri dodiru kartice); fotografija je rezerva.
  const onScreenCutout = !!found && srcOf(found.img).includes("/ormar/");
  const h = hanger && !onScreenCutout ? await ready(hanger, found ? 90 : 130) : null;
  if (found && onScreenCutout) {
    src = found.img.currentSrc || found.img.src;
    nat = { w: found.img.naturalWidth, h: found.img.naturalHeight };
  } else if (h) {
    src = h.currentSrc || h.src;
    nat = { w: h.naturalWidth, h: h.naturalHeight };
  } else if (found) {
    src = found.img.currentSrc || found.img.src;
    kind = "photo";
    nat = { w: found.img.naturalWidth, h: found.img.naturalHeight };
  } else {
    const ph = item.imageSrc ? await ready(item.imageSrc, 140) : null;
    if (!ph) return false;
    src = ph.currentSrc || ph.src;
    kind = "photo";
    nat = { w: ph.naturalWidth, h: ph.naturalHeight };
  }
  let size: { w: number; h: number };
  if (found && kind === "cutout" && src === (found.img.currentSrc || found.img.src)) {
    // Isti izrezak kao na ekranu: kopija točno preko originala (object-fit: contain), pa se odvoji.
    const shown = fit(nat.w, nat.h, 1);
    const k = Math.min(found.rect.width / shown.w, found.rect.height / shown.h);
    size = { w: shown.w * k, h: shown.h * k };
    const cap = 560 / Math.max(size.w, size.h);
    if (cap < 1) size = { w: size.w * cap, h: size.h * cap };
  } else if (kind === "photo") {
    // fotografija leti kao uspravna pločica (ne razvučena po cijeloj galeriji)
    const b = found ? clamp(Math.min(found.rect.width, found.rect.height) * 0.9, 72, 200) : box;
    size = { w: b * 0.82, h: b };
  } else {
    const b = found ? clamp(Math.min(found.rect.width, found.rect.height) * 0.92, 72, 220) : box;
    size = fit(nat.w, nat.h, b);
  }

  const dir = Math.sign(target.at.x - center.x) || 1;
  const flights: Flight[] = [
    {
      el: makeFlyer(src, size.w, size.h, kind),
      from: center,
      to: target.at,
      w: size.w,
      h: size.h,
      endSize: 20,
      delay: 0,
      spin: dir * 16
    }
  ];

  // Mix: lopta i kapa lete odmah za dresom (malo manje, s kratkim razmakom).
  const addons = (["lopta", "kapa"] as MixKind[]).filter((k) => item.addons?.[k]);
  addons.forEach((k, i) => {
    const a = mixImage(k, item.addons![k]!);
    const m = findSourceImage([a], tap);
    const s = 54;
    flights.push({
      el: makeFlyer(a, s, s, "cutout"),
      from: m
        ? { x: m.rect.left + m.rect.width / 2, y: m.rect.top + m.rect.height / 2 }
        : { x: center.x + (i ? 1 : -1) * size.w * 0.42, y: center.y + size.h * 0.18 },
      to: { x: target.at.x, y: target.at.y + 1 },
      w: s,
      h: s,
      endSize: 14,
      delay: 70 + i * 70,
      spin: (k === "lopta" ? 1 : -1) * dir * 70 // lopta se zavrti jače
    });
  });

  const root = getLayer();
  let last = 0;
  let firstImpact = Infinity;
  flights.forEach((f, i) => {
    root.appendChild(f.el);
    const { frames, duration } = flightKeyframes(f);
    const anim = f.el.animate(frames, { duration, delay: f.delay, easing: "linear", fill: "both" });
    const end = f.delay + duration;
    last = Math.max(last, end);
    firstImpact = Math.min(firstImpact, end);
    anim.onfinish = () => {
      f.el.remove();
      bounceTarget(target.el, i === 0 ? 1 : 0.45);
      if (i === 0) window.dispatchEvent(new Event(LAND_EVENT));
    };
    anim.oncancel = () => {
      f.el.remove();
      if (i === 0) window.dispatchEvent(new Event(LAND_EVENT)); // značka nikad ne ostaje "zamrznuta"
    };
  });

  // Prozor/ladica pričekaju udar + trenutak da se vidi odskok ikone.
  holdOverlays(firstImpact + 130);
  window.setTimeout(() => {
    if (!root.childElementCount) root.remove();
  }, last + 200);
  return true;
}

/** Globalni slušač — montira se jednom (u AddToCartModal). */
export function FlyToCart() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      lastTap = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (!manifest) return;
      const slug = slugNear(e.target);
      const h = slug ? hangerFor(slug) : undefined;
      if (h) warm(h);
    };
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent<CartAddDetail>).detail;
      if (!detail?.item || reducedMotion()) return;
      // "Iz košarice" vrijedi samo kad su prozor/ladica stvarno vidljivi — dok proizvod leti,
      // prozor još čeka, pa je drugo brzo dodavanje i dalje s kartice/stranice.
      if (detail.fromCart && !isFlying()) return;
      if (/^\/(kosarica|checkout)(\/|$)/.test(location.pathname)) return;
      if (!findTarget()) return;
      // Značke odmah zadrže stari broj (prije nego React prikaže novi).
      window.dispatchEvent(new Event(FLY_EVENT));
      holdOverlays(1200); // sigurnosna mreža dok se slika ne odredi
      launch(detail)
        .then((ok) => {
          if (!ok) {
            holdOverlays(0);
            window.dispatchEvent(new Event(LAND_EVENT));
          }
        })
        .catch(() => {
          holdOverlays(0);
          window.dispatchEvent(new Event(LAND_EVENT));
        });
    };
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener(CART_ADD_EVENT, onAdd);

    // Manifest vješalica tek kad je stranica mirna (ne u prvom iscrtavanju).
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number; cancelIdleCallback?: (id: number) => void };
    const idleId = w.requestIdleCallback ? w.requestIdleCallback(loadManifest, { timeout: 4000 }) : null;
    const timeoutId = idleId == null ? window.setTimeout(loadManifest, 2500) : null;

    return () => {
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener(CART_ADD_EVENT, onAdd);
      if (idleId != null) w.cancelIdleCallback?.(idleId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);
  return null;
}

/* ---------------- Značka košarice ---------------- */

/**
 * Broj za značku: dok proizvod leti, drži stari broj; na udar prikaže novi
 * i "otkuca" (opruga). Bez leta (brisanje, učitavanje, smanjeni pokreti) — odmah.
 * `ref` ide na element značke, `tick` mijenja se pri svakom otkucaju (za key).
 */
export function useCartBadge(itemCount: number) {
  const live = useRef(itemCount);
  live.current = itemCount;
  const [held, setHeld] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const pending = useRef<"pop" | "appear" | null>(null);
  const heldRef = useRef<number | null>(null);

  useEffect(() => {
    // Više letova zaredom (npr. dvije veličine brzo): svaki udar doda točno jedan broj.
    let inAir = 0;
    const onFly = () => {
      inAir += 1;
      if (heldRef.current == null) {
        heldRef.current = live.current;
        setHeld(live.current);
      }
    };
    const onLand = () => {
      const prev = heldRef.current;
      if (prev == null || inAir === 0) return;
      inAir -= 1;
      pending.current = prev === 0 ? "appear" : "pop";
      if (inAir > 0) {
        heldRef.current = prev + 1;
        setHeld(prev + 1);
      } else {
        heldRef.current = null;
        setHeld(null);
      }
      setTick((n) => n + 1);
    };
    window.addEventListener(FLY_EVENT, onFly);
    window.addEventListener(LAND_EVENT, onLand);
    return () => {
      window.removeEventListener(FLY_EVENT, onFly);
      window.removeEventListener(LAND_EVENT, onLand);
    };
  }, []);

  useIsoLayoutEffect(() => {
    const mode = pending.current;
    pending.current = null;
    const el = ref.current;
    if (!mode || !el || typeof el.animate !== "function") return;
    const N = 26;
    const D = 560;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * (D / 1000);
      const s = mode === "appear" ? step(t, 3.4, 0.42) : 1 + 0.3 * impulse(t, 3.6, 0.36);
      frames.push({ offset: i / N, transform: `scale(${s.toFixed(4)})` });
    }
    el.animate(frames, { duration: D, easing: "linear" });
    // nova znamenka uđe odozdo
    const digit = el.firstElementChild as HTMLElement | null;
    digit?.animate(
      [
        { transform: "translateY(70%)", opacity: 0 },
        { transform: "translateY(-6%)", opacity: 1, offset: 0.55 },
        { transform: "translateY(0)", opacity: 1 }
      ],
      { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
  }, [tick]);

  return { count: held == null ? itemCount : Math.min(held, itemCount), ref, tick };
}
