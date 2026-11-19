/* ------------------------------------------------------------------ */
/*  NOVI DIZAJN — prazne zamjene za STARI chrome iz app/layout.tsx.     */
/*  Layout ih uvozi uvijek (OFF grana), pa bi ih Next u buildu sa        */
/*  zastavicom svejedno spakirao u JS layouta = na SVAKU stranicu (stari */
/*  Navbar/ladica/prozor vuku framer-motion, ~39 kB gzip). U novom        */
/*  dizajnu se nikad ne iscrtavaju (layout: `novi ? … : …`), pa ih        */
/*  next.config.mjs (NOVI_SWAPS, samo sa zastavicom) zamijeni ovom        */
/*  datotekom. Bez zastavice ova datoteka nije ni u buildu.              */
/* ------------------------------------------------------------------ */

export function Navbar() {
  return null;
}
export function AnnouncementBar() {
  return null;
}
export function Footer() {
  return null;
}
export function BottomNav() {
  return null;
}
export function CartDrawer() {
  return null;
}
export function AddToCartModal() {
  return null;
}
export function SocialProof() {
  return null;
}
export function ChatWidget() {
  return null;
}
