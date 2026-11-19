import path from "node:path";
import { fileURLToPath } from "node:url";

// NOVI DIZAJN (lib/novi-dizajn.ts): jedina zastavica, samo u buildu. Bez nje (zadano, produkcija)
// ova datoteka daje točno istu konfiguraciju kao prije — ključ `webpack` se ni ne dodaje.
// S njom webpack zamijeni module njihovim inačicama za novi dizajn (po ruti zaseban modul, da
// svaka ruta nosi samo svoj novi JS):
//   components/novi/{index,home,product,cart,checkout}.ts → components/novi/on{,-home,-product,-cart,-checkout}.tsx
//   components/site/product-card.tsx       → components/novi/product-card.tsx (kartica "ime", vješalica)
//   components/providers/cart-provider.tsx → components/novi/cart-provider.tsx (let u košaricu, bez starog prozora)
//   components/site/mix-jersey-chooser.tsx → components/novi/mix-jersey-chooser.tsx (/slozi-mix: vješalica, ne bijela foto)
const NOVI_DIZAJN = process.env.NEXT_PUBLIC_NOVI_DIZAJN === "1";
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const NOVI_SWAPS = [
  [/[\\/]components[\\/]novi[\\/]index\.ts$/, "components/novi/on.tsx"],
  [/[\\/]components[\\/]novi[\\/]home\.ts$/, "components/novi/on-home.tsx"],
  [/[\\/]components[\\/]novi[\\/]product\.ts$/, "components/novi/on-product.tsx"],
  [/[\\/]components[\\/]novi[\\/]cart\.ts$/, "components/novi/on-cart.tsx"],
  [/[\\/]components[\\/]novi[\\/]checkout\.ts$/, "components/novi/on-checkout.tsx"],
  [/[\\/]components[\\/]site[\\/]product-card\.tsx$/, "components/novi/product-card.tsx"],
  [/[\\/]components[\\/]providers[\\/]cart-provider\.tsx$/, "components/novi/cart-provider.tsx"],
  [/[\\/]components[\\/]site[\\/]mix-jersey-chooser\.tsx$/, "components/novi/mix-jersey-chooser.tsx"],
  // stari chrome iz app/layout.tsx (OFF grana) se u novom dizajnu ne iscrtava → prazne zamjene, da njegov JS
  // (framer-motion, stara ladica/prozor/navigacija) ne ide u layout chunk svake stranice
  [/[\\/]components[\\/]site[\\/](navbar|announcement-bar|footer|bottom-nav|cart-drawer|add-to-cart-modal|social-proof|chat-widget)\.tsx$/, "components/novi/legacy-chrome-off.tsx"],
  // isto za sekcije stare naslovnice (uvozi ih samo app/page.tsx, nova naslovnica ih ne iscrtava)
  [/[\\/]components[\\/]home[\\/](hero-section|featured-section|games-cta|home-catalog-tabs|instagram-section|newsletter-section|reviews-section|streetwear-banner|trenirka-banner|trust-strip)\.tsx$/, "components/novi/legacy-home-off.tsx"],
  [/[\\/]components[\\/]site[\\/]testimonials-section\.tsx$/, "components/novi/legacy-home-off.tsx"]
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Suženi srcSet: dresovi/kompleti se nikad ne prikazuju veći od ~1920px, a
    // zadani Next raspon išao je do 2048/3840 → svaka <img> je nosila 16 varijanti
    // (kartice od 112px do 3840w) i naduvavao HTML. Dovoljno za HR mobilnu publiku.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    // Optimizirane slike (/_next/image) drže se 30 dana u cacheu (prije max-age=0).
    minimumCacheTTL: 2592000,
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" }
    ]
  },
  reactStrictMode: true,
  ...(NOVI_DIZAJN
    ? {
        webpack(config, { webpack }) {
          for (const [re, to] of NOVI_SWAPS) {
            config.plugins.push(new webpack.NormalModuleReplacementPlugin(re, path.join(ROOT, to)));
          }
          return config;
        }
      }
    : {}),
  // Statični mediji (hero reklame, posteri, božićne slike) godinu dana u cacheu
  // preglednika. VAŽNO: datoteku u /public/hero ili /public/bozic NIKAD ne mijenjaj
  // pod istim imenom — kod promjene sadržaja daj NOVO ime (npr. reklama-v5.mp4,
  // kapica-v2.webp) i ažuriraj putanju u kodu, inače posjetitelji godinu dana vide staru.
  async headers() {
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/hero/:path*", headers: immutable },
      { source: "/bozic/:path*", headers: immutable }
    ];
  },
  // 301 za obrisane proizvode (GSC 404) → najbliža relevantna stranica, da se ne
  // gubi SEO vrijednost i da nema 404 u indexu. Ronaldo/Ronaldinho na njihove landinge.
  async redirects() {
    return [
      { source: "/dres/real-ronaldo-2014", destination: "/dresovi/igrac/ronaldo/", permanent: true },
      { source: "/dres/psg-ronaldinho-retro", destination: "/dresovi/igrac/ronaldinho/", permanent: true },
      { source: "/dres/manchester-city-crni", destination: "/dresovi/", permanent: true },
      { source: "/dres/milan-ibrahimovic", destination: "/dresovi/", permanent: true },
      // Duplikat istog dresa (statični + custom iz admina) → aktivna stranica.
      // Slug mora biti i u REDIRECTED_PRODUCT_SLUGS (lib/data/jerseys.ts).
      { source: "/dres/manutd-sesko", destination: "/dres/manchester-united-sesko/", permanent: true },
      // Stare mini igre su ugašene (ostaju Penalty Cup, Kviz dana, Žongliranje i
      // Kolo sreće) — 308 na hub igara, da linkovi i bookmarki ne vode u 404.
      ...["flappy", "zmija", "uhvati", "trkac", "gadaj", "spojnica"].map((slug) => ({
        source: `/${slug}`,
        destination: "/igre/",
        permanent: true
      }))
    ];
  }
};

export default nextConfig;
