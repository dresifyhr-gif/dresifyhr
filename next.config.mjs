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
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" }
    ]
  },
  reactStrictMode: true,
  // 301 za obrisane proizvode (GSC 404) → najbliža relevantna stranica, da se ne
  // gubi SEO vrijednost i da nema 404 u indexu. Ronaldo/Ronaldinho na njihove landinge.
  async redirects() {
    return [
      { source: "/dres/real-ronaldo-2014", destination: "/dresovi/igrac/ronaldo/", permanent: true },
      { source: "/dres/psg-ronaldinho-retro", destination: "/dresovi/igrac/ronaldinho/", permanent: true },
      { source: "/dres/manchester-city-crni", destination: "/dresovi/", permanent: true },
      { source: "/dres/milan-ibrahimovic", destination: "/dresovi/", permanent: true }
    ];
  }
};

export default nextConfig;
