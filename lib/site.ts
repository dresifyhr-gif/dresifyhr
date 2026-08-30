export const SITE_NAME = "DRESIFY";
export const SITE_URL = "https://dresifyshop.com";
export const SITE_DESCRIPTION =
  "Nogometni dresovi za djecu i odrasle — svi klubovi i reprezentacije, retro klasici. Vrhunska izrada, 20\u20ac, dostava po cijeloj Hrvatskoj uz pla\u0107anje pouze\u0107em.";
export const WHATSAPP_NUMBER = "385976047510";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const INSTAGRAM_HANDLE = "@dresify.hr";
export const INSTAGRAM_URL = "https://instagram.com/dresify.hr";
// Google recenzije (Business Profile) — kupci ostave ocjenu na Googleu.
export const GOOGLE_REVIEW_URL = "https://g.page/r/CYyFuSQaXA_MEBM/review";
export const CONTACT_PHONE_DISPLAY = "+385 97 604 7510";
export const CONTACT_EMAIL = "dresify.hr@gmail.com";
export const CURRENCY_LABEL = "20\u20ac";
export const DELIVERY_LABEL = "Dostava 2-5 dana po HR";
export const DEFAULT_OG_IMAGE = "/og-banner-v2.png"; // nova adresa = zaobilazi FB/CDN keš stare slike
export const JERSEY_PRICE_EUR = 20;

// Zadane nabavne cijene (za profit/poravnanje) — mogu se prepisati u Postavkama.
export const COST_DRES_EUR = 6;
export const COST_KOMPLET_EUR = 18;
// Streetwear komplet (prodaja 50 €) — privremena zadana vrijednost, postavi pravu u Postavkama.
export const COST_STREETWEAR_EUR = 25;
// Dugi rukav (prodaja 35 €) — bolji materijal, nabava 10 € → profit 25 € po komadu.
export const COST_LONGSLEEVE_EUR = 10;

export const META_PIXEL_ID = "1621563625577336";
export const HOME_DELIVERY_PRICE_EUR = 6;
export const COD_FEE_EUR = 1;
export const SHIPPING_PRICE_EUR = HOME_DELIVERY_PRICE_EUR + COD_FEE_EUR;
export const SHIPPING_PRICE_LABEL = "7,00 \u20ac";
export const FREE_SHIPPING_THRESHOLD_EUR = 60;
export const FREE_SHIPPING_LABEL = "Besplatna dostava preko 60 \u20ac";
export const ZAGREB_DELIVERY_PRICE_EUR = 0;
export const ZAGREB_DELIVERY_PRICE_LABEL = "0,00 \u20ac";
export const PAYMENT_METHOD_LABEL = "Pouze\u0107e";
export const SHIPPING_SOURCE_NOTE =
  "GLS javni cjenik: dostava do 1 kg 6,00 \u20ac + pouze\u0107e 1,00 \u20ac.";

export const NAV_LINKS = [
  { href: "/", label: "Po\u010detna" },
  { href: "/dresovi", label: "Dresovi" },
  { href: "/blog", label: "Blog" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/o-nama", label: "O nama" }
] as const;

export const CONTACT_CHANNELS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "whatsapp",
    description: "Najbr\u017ei odgovor i potvrda dostupnosti"
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "instagram",
    description: "Po\u0161alji screenshot ili link u DM"
  }
] as const;

export const FULFILLMENT_OPTIONS = [
  {
    id: "zagreb_delivery",
    label: "Besplatna dostava Zagreb",
    icon: "zagreb_delivery",
    description: "Osobno dostavljamo unutar Zagreba, bez tro\u0161ka dostave"
  },
  {
    id: "delivery",
    label: "Dostava pouze\u0107em",
    icon: "delivery",
    description: "Pla\u0107anje pri preuzimanju, 7,00 \u20ac dostava po Hrvatskoj"
  },
  {
    id: "pickup",
    label: "Osobno preuzimanje",
    icon: "pickup",
    description: "Preuzimanje po dogovoru, bez tro\u0161ka dostave"
  }
] as const;
