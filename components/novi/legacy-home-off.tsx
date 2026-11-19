/* ------------------------------------------------------------------ */
/*  NOVI DIZAJN — prazne zamjene za sekcije STARE naslovnice.           */
/*  app/page.tsx ih uvozi uvijek (OFF grana); Next bi ih u buildu sa      */
/*  zastavicom svejedno spakirao u JS naslovnice (stari hero, katalog,    */
/*  recenzije → framer-motion i ~100 kB koda koji se nikad ne iscrta).   */
/*  Nova naslovnica ih ne iscrtava (`if (noviHome) return …`), pa ih      */
/*  next.config.mjs (NOVI_SWAPS, samo sa zastavicom) zamijeni ovom        */
/*  datotekom. Koriste se SAMO u app/page.tsx (provjereno grepom).       */
/* ------------------------------------------------------------------ */

export function HeroSection() {
  return null;
}
export function FeaturedSection() {
  return null;
}
export function GamesCta() {
  return null;
}
export function HomeCatalogTabs() {
  return null;
}
export function InstagramSection() {
  return null;
}
export function NewsletterSection() {
  return null;
}
export function ReviewsSection() {
  return null;
}
export function StreetwearBanner() {
  return null;
}
export function TrenirkaBanner() {
  return null;
}
export function TrustStrip() {
  return null;
}
export function TestimonialsSection() {
  return null;
}
