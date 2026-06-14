export const SITE_NAME = "DRESIFY";
export const SITE_URL = "https://dresifyshop.com";
export const SITE_DESCRIPTION =
  "Kupuj nogometne dresove online u Hrvatskoj — dresovi za djecu i odrasle. Svaki dres. Svaki klub. 20\u20ac.";
export const WHATSAPP_NUMBER = "385976047510";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const INSTAGRAM_HANDLE = "@dresify.hr";
export const INSTAGRAM_URL = "https://instagram.com/dresify.hr";
export const CONTACT_PHONE_DISPLAY = "+385 97 604 7510";
export const CONTACT_EMAIL = "dresify.hr@gmail.com";
export const CURRENCY_LABEL = "20\u20ac";
export const DELIVERY_LABEL = "Dostava 2-5 dana po HR";
export const DEFAULT_OG_IMAGE = "/og-default.svg";
export const JERSEY_PRICE_EUR = 20;

export const META_PIXEL_ID = "1621563625577336";
export const HOME_DELIVERY_PRICE_EUR = 6.5;
export const COD_FEE_EUR = 1;
export const SHIPPING_PRICE_EUR = HOME_DELIVERY_PRICE_EUR + COD_FEE_EUR;
export const SHIPPING_PRICE_LABEL = "7,50 \u20ac";
export const ZAGREB_DELIVERY_PRICE_EUR = 0;
export const ZAGREB_DELIVERY_PRICE_LABEL = "0,00 \u20ac";
export const PAYMENT_METHOD_LABEL = "Pouze\u0107e";
export const SHIPPING_SOURCE_NOTE =
  "HP Paket24 javni cjenik od 1.1.2026.: dostava do 1 kg 6,50 \u20ac + pouze\u0107e 1,00 \u20ac.";

export const NAV_LINKS = [
  { href: "/", label: "Po\u010detna" },
  { href: "/dresovi", label: "Dresovi" },
  { href: "/blog", label: "Blog" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/o-nama", label: "O nama" }
] as const;

export const SOCIAL_PROOF_MESSAGES = [
  "Luka iz Zagreba upravo naru\u010dio Real Madrid dres",
  "Maja iz Splita upravo naru\u010dila Barcelona komplet",
  "Ivan iz Rijeke upravo naru\u010dio Brazil dres",
  "Sara iz Osijeka upravo naru\u010dila Hrvatska dres",
  "Josip iz Zadra upravo naru\u010dio PSG dres",
  "Petra iz Vara\u017edina upravo naru\u010dila Juventus dres"
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
    description: "Pla\u0107anje pri preuzimanju, 7,50 \u20ac dostava po Hrvatskoj"
  },
  {
    id: "pickup",
    label: "Osobno preuzimanje",
    icon: "pickup",
    description: "Preuzimanje po dogovoru, bez tro\u0161ka dostave"
  }
] as const;
