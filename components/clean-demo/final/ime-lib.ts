import { dTitle, dVariant } from "@/components/clean-demo/d/d-css";
import { splitName } from "@/components/home/ormar/ormar-g-lib";
import { displayIgrac } from "@/components/product/product-faq";
import { getJerseySizeOptions, type Jersey } from "@/lib/data/jerseys";
import { HANGER_IMAGES, type HangerImages } from "@/lib/data/ormar-hanger";
import { repairText } from "@/lib/utils";

import type { ImeCardData } from "./ime-const";
import { fitOf } from "./ime-fit";

export type { ImeCardData };

/* ------------------------------------------------------------------ */
/*  Demo "ime" — kartice i stranica dresa u stilu ProductSpot reklame:  */
/*  tamni ugljen, dres na crnoj vješalici na tankoj kromiranoj šipki,   */
/*  golemo obrisano prezime iza dresa, naslov "YAMAL. BROJ 19."         */
/*  Dijele ga server (podaci) i klijent (kartice, stranica).            */
/* ------------------------------------------------------------------ */


export type ImeNames = {
  club: string;
  /** "Yamal #19" (ili klub kad je naziv generički) */
  title: string;
  variant: string;
  /** "YAMAL" — obrisano slovima iza dresa */
  surname: string;
  /** broj s dresa ("19") ili "" */
  number: string;
};

export function imeNames(p: Pick<Jersey, "klub" | "igrac" | "liga">): ImeNames {
  const club = repairText(p.klub);
  const { title, variant } = splitName(p.igrac);
  const generic = !title || /^komplet$/i.test(title.trim()) || !displayIgrac(p.klub, p.igrac);
  const number = title?.match(/\bnr\.?\s*(\d{1,2})\b/i)?.[1] ?? "";
  const bare = (title ?? "").replace(/\s*\bnr\.?\s*\d{1,2}\b/gi, "").trim();
  // prezime = zadnja riječ, ali: "Neymar Jr." → "NEYMAR JR" (ne "JR."), "Ronaldo R9" → "RONALDO",
  // a opisni naslovi bez igrača ("Posebno izdanje", "… žuti") → ime kluba
  const words = bare.split(/\s+/).filter(Boolean);
  if (words.length > 1 && /^r9$/i.test(words[words.length - 1])) words.pop();
  let last = words.pop() ?? "";
  if (/^(jr|sr)\.?$/i.test(last) && words.length) last = `${words.pop()} ${last.replace(/\.$/, "")}`;
  const descriptive = /^(izdanje|edition|žuti|zuti|crni|bijeli|plavi|crveni|zeleni|sivi|rozi|narančasti|ljubičasti|retro|set|komplet|jakna|hlače|trenirka|\d+)$/i.test(last);
  const cleanVariant = p.liga === "Komplet" ? variant.replace(/\s*\([^)]*\)/g, "").trim() : variant;
  return {
    club,
    title: generic ? club : dTitle(title),
    variant: dVariant(cleanVariant),
    surname: (generic || descriptive ? club : last.replace(/^[A-Z]\.\s*/, "")).toLocaleUpperCase("hr"),
    number: generic ? "" : number,
  };
}

/** Glavna slika na vješalici za karticu (isto lice koje je prvo na pozornici). */
export function mainFace(h: HangerImages): string | undefined {
  if (h.kind === "dres") return h.front ?? h.back;
  return h.jakna ?? h.hlace;
}

export function usableHanger(slug: string): HangerImages | null {
  const h = HANGER_IMAGES[slug];
  if (!h) return null;
  if (h.kind === "trenirka" && !h.jakna && !h.hlace) return null;
  return h;
}


/** Dostupnost po segmentu (iste odluke kao stranica dresa). */
function stock(p: Jersey) {
  const o = getJerseySizeOptions(p);
  const avail = (a: string[], out: boolean) => (out ? [] : a.filter((s) => !o.soldOutSizes.includes(s)));
  const adults = avail(o.adults, o.adultsOutOfStock).length;
  const kids = avail(o.kids, o.kidsOutOfStock).length;
  const none = o.adults.length === 0 && o.kids.length === 0;
  return { adults, kids, hasAdults: o.adults.length > 0, soldOut: !none && adults + kids === 0 };
}

/** Sve veličine rasprodane. */
export const isSoldOut = (p: Jersey) => stock(p).soldOut;

/** Odrasli rasprodani, dječje ima → na kartici i naslovnici piše "Samo dječje". */
export function kidsOnly(p: Jersey) {
  const s = stock(p);
  return s.hasAdults && s.adults === 0 && s.kids > 0;
}

export function cardData(p: Jersey): ImeCardData | null {
  const h = usableHanger(p.slug);
  const img = h ? mainFace(h) : undefined;
  if (!img) return null;
  const n = imeNames(p);
  // izmjereno iz alfe (lib/data/hanger-fit.ts): omjer i x kuke (kod slike bez kuke: vrh tijela vješalice)
  const g = fitOf(img);
  return {
    slug: p.slug,
    club: n.club,
    title: n.title,
    variant: n.variant,
    surname: n.surname,
    number: n.number,
    price: p.price ?? 20,
    img,
    aspect: g.ar,
    hookX: g.k === "dome" ? g.fx : g.hx,
    soldOut: isSoldOut(p),
    kidsOnly: kidsOnly(p),
  };
}

