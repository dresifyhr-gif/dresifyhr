"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useEText } from "../e-i18n";
import { useReducedMotion } from "./zive-hooks";

export type ZiveProduct = { href: string; price: string; label: string };

/** Kadar = statična Blender (Cycles) slika iz iste garderobe kao naslovnica.
 *  d = desktop kadar, m = mobilni kadar (drugačija kompozicija, ne samo izrez). */
export type ZiveShot = { d: string; m: string; alt: string };
const SHOT_BASE = "/zive/kartice";
const shot = (name: string, alt: string): ZiveShot => ({ d: `${SHOT_BASE}/${name}-d`, m: `${SHOT_BASE}/${name}-m`, alt });
/** Male kartice (4:5, isti kadar za mobitel i desktop): jedna slika 2x veličine prikaza, d === m. */
const small = (name: string, alt: string): ZiveShot => ({ d: `${SHOT_BASE}/${name}-s`, m: `${SHOT_BASE}/${name}-s`, alt });

export const SHOTS = {
  mix: shot("mix", "Dres Barcelona Yamal na vješalici, odmah ispod njega lopta i kapa na mokrom betonu"),
  komplet: small("komplet", "Komplet Barcelona Yamal: dres i hlačice na vješalicama, lopta i kapa na crnom mramornom postolju"),
  trenirka: small("trenirka", "Trenirka Argentina Messi 10: jakna (leđa) i hlače na vješalicama, ispod mramorno postolje"),
  street: small("street", "Corteiz Wreath set: narančasta majica i kratke hlače na vješalicama iznad mramornog postolja"),
  igre: small("igre", "Crna lopta, mobitel s igrom, kontroler i pehar na mramornom postolju, iza gol s mrežom"),
} as const;

/** Desktop kadar od 768 px (isti prijelom kao mreža). */
const BP = "(min-width: 768px)";

function Shot({ s, kind }: { s: ZiveShot; kind?: string }) {
  const t = useEText();
  const alt = kind && kind in t.alt ? t.alt[kind as keyof typeof t.alt] : s.alt;
  return (
    <picture className="zv-media">
      {s.d !== s.m && <source media={BP} type="image/avif" srcSet={`${s.d}.avif`} />}
      {s.d !== s.m && <source media={BP} type="image/webp" srcSet={`${s.d}.webp`} />}
      <source type="image/avif" srcSet={`${s.m}.avif`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${s.m}.webp`} alt={alt} loading="lazy" decoding="async" draggable={false} />
    </picture>
  );
}

/** Jednom, kad kartica uđe u ekran: reflektor se upali + polagani "push-in" kadra (samo transform/opacity). */
function useEnter<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  // undefined (SSR / bez JS: kadar normalno vidljiv) -> "0" (čeka ekran, reflektor ugašen) -> "1"
  const [state, setState] = useState<"0" | "1" | undefined>(undefined);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setState(undefined);
      return;
    }
    setState((s) => s ?? "0");
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          // dva kadra: preglednik prvo nacrta ugašeno stanje, pa tek onda pali (inače nema prijelaza)
          requestAnimationFrame(() => requestAnimationFrame(() => setState("1")));
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);
  return [ref, state] as const;
}

const Arrow = () => (
  <svg className="zv-arrow" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
  </svg>
);

function Caption({ over, title, sub, meta }: { over: string; title: ReactNode; sub?: string; meta?: ReactNode }) {
  return (
    <div className="zv-cap">
      <span className="zv-over">{over}</span>
      <h3 className="zv-title">{title}</h3>
      {sub ? <p className="zv-sub">{sub}</p> : null}
      <span className="zv-meta">
        {meta}
        <Arrow />
      </span>
    </div>
  );
}

/** Kartica s kadrom: slika do ruba, tamni gradijent dolje, naslov u Bebasu. */
export function ShotCard({ href, s, kind, children, label }: { href: string; s: ZiveShot; kind: string; children: ReactNode; label: string }) {
  const [ref, inView] = useEnter<HTMLAnchorElement>();
  return (
    <Link ref={ref} href={href} className={`zv-card zv-card--${kind}`} data-in={inView} aria-label={label}>
      <Shot s={s} kind={kind} />
      <span className="zv-lamp" aria-hidden="true" />
      <span className="zv-shade" aria-hidden="true" />
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* VIDEO — božićna reklama kao "ekran" u mračnoj garderobi: video gore,
   ispod njega odsjaj na mokrom podu (unaprijed zamućen, bez runtime filtera). */
/* ------------------------------------------------------------------ */
const VIDEO = { av1: "/zive/bozic-av1.mp4", h264: "/zive/bozic.mp4", poster: "/zive/bozic-poster.webp", refl: `${SHOT_BASE}/bozic-refl.webp` };
/** Reklama izmjenjuje više dresova (Mbappé, Ronaldo, Francuska...) -> neutralan natpis koji vodi na katalog,
 *  a ne jedan proizvod koji se u videu uopće ne vidi. `p` ostaje u potpisu radi kompatibilnosti s podacima stranice. */
const VIDEO_CTA = { href: "#dresovi" };

export function VideoCard({ p }: { p?: ZiveProduct }) {
  const t = useEText();
  const [box, inView] = useEnter<HTMLAnchorElement>();
  const vid = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [near, setNear] = useState(false);
  const [on, setOn] = useState(false);

  // učitaj tek blizu ekrana; sviraj samo dok je vidljiv
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const nearIo = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "600px 0px" });
    nearIo.observe(el);
    return () => nearIo.disconnect();
  }, [box]);

  useEffect(() => {
    const el = box.current;
    const v = vid.current;
    if (!el || !v || !near || reduced) return;
    let visible = false;
    const sync = () => {
      if (visible && !document.hidden) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(
      (es) => {
        visible = es.some((e) => e.isIntersecting && e.intersectionRatio > 0.2);
        sync();
      },
      { threshold: [0, 0.2, 0.5] },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      v.pause();
    };
  }, [box, near, reduced]);

  return (
    <Link ref={box} href={VIDEO_CTA.href} className="zv-card zv-card--video" data-in={inView} aria-label={`${t.videoOver} · ${t.browse}`}>
      <span className="zv-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="zv-poster" src={VIDEO.poster} alt="" decoding="async" loading="lazy" />
        {near && (
          <video
            ref={vid}
            className="zv-video"
            data-on={on ? "1" : "0"}
            muted
            loop
            playsInline
            preload="metadata"
            poster={VIDEO.poster}
            disableRemotePlayback
            onPlaying={() => setOn(true)}
            aria-hidden="true"
          >
            <source src={VIDEO.av1} type='video/mp4; codecs="av01.0.04M.08"' />
            <source src={VIDEO.h264} type='video/mp4; codecs="avc1.640020"' />
          </video>
        )}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="zv-refl" src={VIDEO.refl} alt="" decoding="async" loading="lazy" aria-hidden="true" />
      <span className="zv-shade zv-shade--video" aria-hidden="true" />
      <Caption over={t.videoOver} title={t.browse} meta={<b className="zv-meta-l">{t.browse}</b>} />
    </Link>
  );
}

export function MixCard({ p }: { p: ZiveProduct }) {
  const t = useEText();
  return (
    <ShotCard href={p.href} s={SHOTS.mix} kind="mix" label={`${t.mixTitle}, ${p.price}`}>
      <Caption over={t.mixOver} title={t.mixTitle} sub={t.mixSub} meta={<b>{p.price}</b>} />
    </ShotCard>
  );
}

export function KompletCard({ p }: { p: ZiveProduct }) {
  const t = useEText();
  return (
    <ShotCard href="/kompleti/" s={SHOTS.komplet} kind="komplet" label={`${t.kits} · ${p.label}, ${p.price}`}>
      <Caption over={t.kitOver} title={t.kits} meta={<><span>{p.label}</span><b>{t.priceFrom} {p.price}</b></>} />
    </ShotCard>
  );
}

export function TrenirkaCard({ p }: { p: ZiveProduct }) {
  const t = useEText();
  return (
    <ShotCard href="/trenirke/" s={SHOTS.trenirka} kind="trenirka" label={`${t.tracksuits} · ${p.label}, ${p.price}`}>
      <Caption over={t.trOver} title={t.tracksuits} meta={<><span>{p.label}</span><b>{t.priceFrom} {p.price}</b></>} />
    </ShotCard>
  );
}

export function StreetCard({ p }: { p: ZiveProduct }) {
  const t = useEText();
  return (
    <ShotCard href="/streetwear/" s={SHOTS.street} kind="street" label={`Streetwear · ${p.label}, ${p.price}`}>
      <Caption over={t.stOver} title="Streetwear" meta={<><span>{p.label}</span><b>{t.priceFrom} {p.price}</b></>} />
    </ShotCard>
  );
}

export function IgreCard({ href = "/igre/" }: { href?: string }) {
  const t = useEText();
  return (
    <ShotCard href={href} s={SHOTS.igre} kind="igre" label={`${t.games}: ${t.gamesSub.replace(/\.$/, "")}`}>
      <Caption over={t.gamesOver} title={t.games} sub={t.gamesSub} meta={<b>{t.play}</b>} />
    </ShotCard>
  );
}
