"use client";

import { useEffect, useLayoutEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Otvaranje kartice → stranica dresa i natrag (dijeljeni elementi).   */
/*                                                                      */
/*  Kartica označi dijelove s data-vt="jersey|name|rail|over", stranica */
/*  iste dijelove s data-vt-to="…". Imena view-transition-name se       */
/*  postavljaju SAMO za vrijeme prijelaza (nikad dva ista na stranici).  */
/*  Naslov proizvoda NIJE dijeljen: u stupcu za kupnju ulazi postupno   */
/*  (html.ime-arrive → CSS kaskada u ime-const.ts).                     */
/*                                                                      */
/*  1) View Transitions API: document.startViewTransition + router;     */
/*     povratni poziv čeka da nova stranica stvarno bude u DOM-u.        */
/*  2) Natrag (gumb ili tipka preglednika): isti elementi, obrnuto.      */
/*     popstate se presretne u fazi hvatanja i ponovno pošalje Next      */
/*     routeru UNUTAR prijelaza.                                        */
/*  3) Bez API-ja: FLIP — slika dresa s kartice preleti na pozornicu.    */
/*  4) Smanjeni pokreti: obična navigacija.                              */
/* ------------------------------------------------------------------ */

type Router = { push: (href: string) => void; back: () => void };
type VT = { finished: Promise<void> };
type VTDoc = Document & { startViewTransition?: (cb: () => Promise<void>) => VT };

const ATTRS = { card: "data-vt", page: "data-vt-to" } as const;

const setNames = (root: ParentNode | null, attr: "data-vt" | "data-vt-to", on: boolean) => {
  root?.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
    if (on) el.style.setProperty("view-transition-name", `ime-${el.getAttribute(attr)}`);
    else el.style.removeProperty("view-transition-name");
  });
};

const hostOf = (slug: string) => document.querySelector<HTMLElement>(`[data-ime-pdp="${CSS.escape(slug)}"]`);
/** Kartica za povratak: ista stavka može biti i na sceni naslovnice i u katalogu ispod →
 *  uzmi onu koja je u prozoru (inače prvu). */
const cardOf = (slug: string) => {
  // kopija scene naslovnice (fiksna, data-proxy) je meta samo kad je scena na ekranu
  const heroOn = window.scrollY < window.innerHeight * 0.5;
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-ime-card="${CSS.escape(slug)}"]`)).filter(
    (el) => heroOn || !el.hasAttribute("data-proxy")
  );
  const inView = (el: HTMLElement) => {
    const j = el.querySelector<HTMLElement>('[data-vt="jersey"]') ?? el;
    const r = j.getBoundingClientRect();
    return r.width > 2 && r.bottom > 0 && r.top < window.innerHeight;
  };
  return all.find(inView) ?? all[0] ?? null;
};

const html = () => document.documentElement;
const canVT = () => typeof (document as VTDoc).startViewTransition === "function";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let pending: { slug: string; src: string; rect: DOMRect } | null = null;
let busy = false;
/** Došli smo na stranicu dresa s kartice (u povijesti je katalog odmah iza). */
let fromCard: string | null = null;
let arriveTimer = 0;

/* ---------------- povratak: skrol i oznaka ---------------- */

const SCROLL_KEY = "final-scroll";
/** Natrag je u tijeku (naslovnica se tada ne pokazuje 2D zamjenu i odmah učita 3D). */
let returning = false;
let returnTimer = 0;
export const isReturning = () => returning;

/** Na odlasku s naslovnice: zapamti skrol i preuzmi ga od preglednika (vraća ga startBack). */
function rememberScroll() {
  if (!document.querySelector("[data-ime-catalog]")) return;
  try {
    sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)));
    history.scrollRestoration = "manual";
  } catch {
    /* bez pohrane */
  }
}
function savedScroll(): number | null {
  try {
    const v = sessionStorage.getItem(SCROLL_KEY);
    return v == null ? null : Number(v);
  } catch {
    return null;
  }
}

/** Čekaj (najviše `max` ms) dok `test` ne vrati element. */
function waitFor<T>(test: () => T | null | undefined, max: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const poll = () => {
      const v = test();
      if (v) return resolve(v);
      if (performance.now() - t0 > max) return resolve(null);
      window.setTimeout(poll, 16);
    };
    poll();
  });
}

/** Pričekaj (najviše `max` ms) da se slika dresa dekodira. */
function ready(host: HTMLElement, max: number): Promise<void> {
  const imgs = Array.from(host.querySelectorAll<HTMLImageElement>('[data-vt-to="jersey"] img'));
  const all = Promise.all(imgs.map((im) => (im.complete && im.naturalWidth ? Promise.resolve() : im.decode().catch(() => undefined))));
  return Promise.race([all.then(() => undefined), new Promise<void>((r) => window.setTimeout(r, max))]);
}

/** Klase na <html> za vrijeme prijelaza (skriva HTML šipku pozornice itd.). */
function mark(cls: string[], on: boolean) {
  cls.forEach((c) => html().classList.toggle(c, on));
}

/* ---------------- kartica → stranica ---------------- */

export function openProduct(router: Router, href: string, slug: string, card: HTMLElement) {
  if (busy) return;
  rememberScroll();
  if (reduced()) return router.push(href);

  if (canVT()) {
    busy = true;
    // trenutna stranica (npr. stranica dresa → "Slični") ne smije zadržati ista imena
    setNames(document, ATTRS.page, false);
    setNames(card, ATTRS.card, true);
    window.clearTimeout(arriveTimer);
    try {
      const vt = (document as VTDoc).startViewTransition!(async () => {
        // nova stranica se montira s kaskadom (naslov → cijena → veličine → gumb)
        mark(["ime-vt", "ime-arrive"], true);
        setNames(card, ATTRS.card, false);
        router.push(href);
        const host = await waitFor(() => hostOf(slug), 3500);
        if (host) {
          setNames(host, ATTRS.page, true);
          // nova snimka tek kad je slika dresa dekodirana (inače WebKit
          // snimi praznu pozornicu pa dres "bljesne" tek nakon leta)
          await ready(host, 700);
        }
      });
      // stara slika kartice mora imati imena dok se ne snimi → makni ih tek u povratnom pozivu (gore)
      fromCard = card.closest("[data-ime-pdp]") ? null : slug;
      vt.finished.finally(() => {
        busy = false;
        setNames(hostOf(slug), ATTRS.page, false);
        setNames(card, ATTRS.card, false);
        mark(["ime-vt"], false);
        arriveTimer = window.setTimeout(() => mark(["ime-arrive"], false), 900);
      });
    } catch {
      busy = false;
      setNames(card, ATTRS.card, false);
      mark(["ime-vt", "ime-arrive"], false);
      router.push(href);
    }
    return;
  }

  // FLIP: zapamti gdje je slika dresa bila na kartici
  const box = card.querySelector<HTMLElement>('[data-vt="jersey"]');
  const img = box?.querySelector("img");
  if (box && img) pending = { slug, src: img.currentSrc || img.src, rect: box.getBoundingClientRect() };
  fromCard = card.closest("[data-ime-pdp]") ? null : slug;
  router.push(href);
}

/* ---------------- stranica → kartica ---------------- */

/*
 * Natrag ne može kroz View Transitions: kod "natrag" preglednika Next zamijeni DOM prije nego
 * se ijedan popstate slušač stigne javiti (snimka bi bila već katalog). Zato: u trenutku
 * odlaska (gumb, ili Navigation API "navigate" prije zamjene) složi se nepomični sloj s
 * kopijom vrha stranice i četiri dijela (dres, prezime, šipka, naslov), pa ti dijelovi
 * odlete na svoja mjesta na kartici kad se katalog iscrta (WAAPI, samo transform/opacity).
 */
const KEYS = ["rail", "name", "over", "jersey"] as const;
const EASE = "cubic-bezier(.22,1,.36,1)";

function startBack(slug: string, go: () => void) {
  const host = hostOf(slug);
  returning = true;
  window.clearTimeout(returnTimer);
  returnTimer = window.setTimeout(() => (returning = false), 4000);
  if (busy || reduced() || !host) {
    go();
    void waitFor(() => (!hostOf(slug) ? document.querySelector("[data-ime-catalog]") : null), 2500).then((ok) => ok && restoreScroll());
    return;
  }
  busy = true;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  // ispod zaglavlja (z-40), koje je isto na obje stranice i ostaje mirno
  Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "35", pointerEvents: "none" });
  const scrim = document.createElement("div");
  Object.assign(scrim.style, { position: "absolute", inset: "0", background: "#0d0d0d" });
  layer.appendChild(scrim);

  // kopija vrha stranice (bez dijelova koji lete) — kratko se pretopi
  const hero = host.querySelector("section");
  let page: HTMLElement | null = null;
  if (hero) {
    const r = hero.getBoundingClientRect();
    page = hero.cloneNode(true) as HTMLElement;
    page.classList.add("ime-ghost", "ime-root");
    Object.assign(page.style, { position: "absolute", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: "0" });
    page.querySelectorAll<HTMLElement>("[data-vt-to]").forEach((el) => (el.style.visibility = "hidden"));
    page.querySelectorAll("canvas").forEach((c) => c.remove());
    layer.appendChild(page);
  }

  const parts: { key: (typeof KEYS)[number]; el: HTMLElement; r: DOMRect }[] = [];
  for (const key of KEYS) {
    const src = host.querySelector<HTMLElement>(`[data-vt-to="${key}"]`);
    if (!src) continue;
    const r = src.getBoundingClientRect();
    if (r.width < 2 || r.height < 1 || r.bottom < 0 || r.top > window.innerHeight) continue;
    const cs = getComputedStyle(src);
    const el = src.cloneNode(true) as HTMLElement;
    Object.assign(el.style, {
      position: "fixed",
      left: `${r.left}px`,
      top: `${r.top}px`,
      right: "auto",
      bottom: "auto",
      width: `${r.width}px`,
      height: `${r.height}px`,
      margin: "0",
      transform: "none",
      transformOrigin: "0 0",
      opacity: "1",
      visibility: "visible",
      backgroundImage: cs.backgroundImage,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      zIndex: "1",
    } as Partial<CSSStyleDeclaration>);
    el.removeAttribute("data-vt-to");
    layer.appendChild(el);
    parts.push({ key, el, r });
  }

  document.body.appendChild(layer);
  go();

  const finish = (hidden: HTMLElement[]) => {
    hidden.forEach((h) => (h.style.visibility = ""));
    layer.remove();
    busy = false;
  };

  void waitFor(() => (!hostOf(slug) ? document.querySelector("[data-ime-catalog],[data-ime-pdp]") : null), 2500).then((ok) => {
    if (!ok) return finish([]);
    // skrol naslovnice vraćamo SAMI, odmah (prije mjerenja kartice i prije nego se zastor
    // počne gasiti) → ispod zastora se nikad ne vidi vrh naslovnice, kartica je na svom mjestu
    restoreScroll();
    requestAnimationFrame(() => {
      restoreScroll();
      const card = cardOf(slug);
      const hidden: HTMLElement[] = [];
      const dur = 620;
      scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 60, easing: "ease-out", fill: "forwards" });
      page?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "linear", fill: "forwards" });
      let last: Animation | null = null;
      for (const p of parts) {
        const to = card?.querySelector<HTMLElement>(`[data-vt="${p.key}"]`);
        const t = to?.getBoundingClientRect();
        if (!to || !t || t.width < 2) {
          last = p.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
          continue;
        }
        to.style.visibility = "hidden";
        hidden.push(to);
        // šipka: puna širina → širina kartice; ostalo: isti omjer
        const sx = t.width / p.r.width;
        const sy = p.key === "rail" ? Math.max(0.2, t.height / p.r.height) : t.height / p.r.height;
        last = p.el.animate(
          [{ transform: "none" }, { transform: `translate(${t.left - p.r.left}px, ${t.top - p.r.top}px) scale(${sx}, ${sy})` }],
          { duration: dur, easing: EASE, fill: "forwards" }
        );
        // povratak na scenu naslovnice: tamo visi leđima → u letu se lice pretopi u leđa,
        // a limeta obris prezimena u sivi (kao na sceni) — bez skoka kad let završi
        if (to.closest("[data-proxy]")) {
          const dst = to.querySelector("img");
          if (p.key === "jersey" && dst) {
            const im = document.createElement("img");
            im.src = dst.currentSrc || dst.src;
            im.alt = "";
            Object.assign(im.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", objectFit: "fill", opacity: "0", zIndex: "2" });
            p.el.appendChild(im);
            im.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur * 0.55, delay: dur * 0.2, easing: "ease-in-out", fill: "forwards" });
          }
          if (p.key === "name") {
            const nameEl = p.el.matches(".ime-outline") ? p.el : p.el.querySelector<HTMLElement>(".ime-outline") ?? p.el;
            nameEl.style.transition = `-webkit-text-stroke-color ${dur}ms ease`;
            void nameEl.offsetWidth;
            nameEl.style.setProperty("-webkit-text-stroke-color", "rgba(233,233,230,0.17)");
          }
        }
      }
      if (last) last.onfinish = () => finish(hidden);
      else window.setTimeout(() => finish(hidden), dur);
    });
  });
}

function restoreScroll() {
  if (!document.querySelector("[data-ime-catalog]")) return;
  const y = savedScroll();
  if (y == null) return;
  if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
}

/** Gumb "Natrag" na stranici dresa. */
export function closeProduct(router: Router, slug: string, fallback: string) {
  const back = fromCard === slug;
  startBack(slug, () => (back ? router.back() : router.push(fallback)));
}

/** Tipka "natrag" preglednika (Navigation API: javlja se prije nego Next zamijeni stranicu). */
export function useBackTransition(slug: string) {
  useEffect(() => {
    type NavEvt = Event & { navigationType: string; destination: { url: string } };
    const nav = (window as Window & { navigation?: EventTarget }).navigation;
    if (!nav) return;
    const on = (e: Event) => {
      const n = e as NavEvt;
      if (n.navigationType !== "traverse" || !hostOf(slug)) return;
      const to = new URL(n.destination.url).pathname.replace(/\/$/, "");
      if (to !== "") return; // natrag na naslovnicu (scena + katalog kartica "ime")
      startBack(slug, () => undefined);
    };
    nav.addEventListener("navigate", on);
    return () => nav.removeEventListener("navigate", on);
  }, [slug]);
}

/* ---------------- FLIP dolazak (bez View Transitions) ---------------- */

/** Na stranici dresa: FLIP dolazak kad preglednik nema View Transitions. */
export function useArrival(slug: string) {
  useLayoutEffect(() => {
    const p = pending;
    pending = null;
    if (!p || p.slug !== slug) return;
    const host = hostOf(slug);
    const target = host?.querySelector<HTMLElement>('[data-vt-to="jersey"]');
    if (!target) return;
    const to = target.getBoundingClientRect();
    if (to.width < 4) return;
    // let s naslovnice: tamo visi leđima, ovdje je lice → u letu se leđa pretope u lice
    // (kao ::view-transition-old/new kod html.f-hero-vt), bez skoka slike na kraju
    const ghost = document.createElement("div");
    const back = document.createElement("img");
    back.src = p.src;
    back.alt = "";
    // svaka slika na pozornici nosi svoj izmjereni položaj u okviru (data-fit, vrh kuke na šipki):
    // slika s kartice se smjesti isto → sleti kukom točno na šipku, bez skoka na kraju leta
    const stageImgs = Array.from(host?.querySelectorAll<HTMLImageElement>(".pz-fl img[data-fit]") ?? []);
    const path = (u: string) => {
      try {
        const x = new URL(u, location.href);
        return x.pathname.startsWith("/_next/image") ? x.searchParams.get("url") ?? x.pathname : x.pathname; // next/image na kartici
      } catch {
        return u;
      }
    };
    const same = stageImgs.find((im) => im.getAttribute("src") === path(p.src));
    const fit = same?.dataset.fit?.split(" ");
    Object.assign(
      back.style,
      fit
        ? { position: "absolute", left: fit[0], top: fit[1], width: fit[2], height: fit[3], maxWidth: "none" }
        : { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "contain", maxWidth: "none" },
    );
    ghost.appendChild(back);
    const face = target.querySelector<HTMLImageElement>("img[data-fit]");
    const faceSrc = face ? face.currentSrc || face.src : "";
    // lice na pozornici: kopija cijelog lica (slika + posuđena kuka), već na pravom mjestu u okviru
    const front = faceSrc && faceSrc !== back.src ? (target.cloneNode(true) as HTMLElement) : null;
    if (front) {
      front.removeAttribute("data-vt-to");
      Object.assign(front.style, { position: "absolute", inset: "0", opacity: "0" });
      ghost.appendChild(front);
    }
    Object.assign(ghost.style, {
      position: "fixed",
      left: `${to.left}px`,
      top: `${to.top}px`,
      width: `${to.width}px`,
      height: `${to.height}px`,
      objectFit: "contain",
      zIndex: "60",
      pointerEvents: "none",
      transformOrigin: "0 0",
    } as CSSStyleDeclaration);
    document.body.appendChild(ghost);
    target.style.opacity = "0";
    // etiketa, odsjaj i sjena pozornice ulaze tek kad dres sleti (isto kao kod View Transitions)
    mark(["ime-vt"], true);
    const sx = p.rect.width / to.width;
    const sy = p.rect.height / to.height;
    const a = ghost.animate(
      [
        { transform: `translate(${p.rect.left - to.left}px, ${p.rect.top - to.top}px) scale(${sx}, ${sy})` },
        { transform: "none" },
      ],
      { duration: 620, easing: "cubic-bezier(.22,1,.36,1)" }
    );
    front?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: 60, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
    if (front) back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 340, delay: 120, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
    const done = () => {
      target.style.opacity = "";
      ghost.remove();
      mark(["ime-vt"], false);
    };
    a.onfinish = done;
    a.oncancel = done;
    // bez prekida u čišćenju: React (strogi način u razvoju) odmah pokrene čišćenje + ponovni
    // efekt, a `pending` je tada već potrošen → let bi nestao nakon jednog kadra. Duh se sam
    // ukloni kad animacija završi (620 ms).
  }, [slug]);
}
