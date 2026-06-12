export type JerseyGalleryImage = {
  src: string;
  altLabel: string;
};

const jerseyMediaMap: Record<string, JerseyGalleryImage[]> = {
  "brazil-ronaldinho-zuti-sp": [
    { src: "/dresovi/brazil-ronaldinho-zuti-sp/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/brazil-ronaldinho-zuti-sp/back.jpg", altLabel: "Stražnja strana" }
  ],
  "barcelona-yamal-domaci": [
    { src: "/dresovi/barcelona-yamal-domaci/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/barcelona-yamal-domaci/back.jpg", altLabel: "Stražnja strana" }
  ],
  "brazil-kaka-crni": [
    { src: "/dresovi/brazil-kaka-crni/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/brazil-kaka-crni/back.jpg", altLabel: "Stražnja strana" }
  ],
  "brazil-neymar-crni": [],
  "brazil-ronaldinho-crni": [],
  "brazil-pele-crni": [],
  "barcelona-yamal-sareni": [
    { src: "/dresovi/barcelona-yamal-sareni/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/barcelona-yamal-sareni/back.jpg", altLabel: "Stražnja strana" }
  ],
  "santos-neymar-bijeli": [
    { src: "/dresovi/santos-neymar-bijeli/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/santos-neymar-bijeli/back.jpg", altLabel: "Stražnja strana" }
  ],
  "barcelona-yamal-rozo": [
    { src: "/dresovi/barcelona-yamal-rozo/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/barcelona-yamal-rozo/back.jpg", altLabel: "Stražnja strana" }
  ],
  "italija-zeleni-posebni": [
    { src: "/dresovi/italija-zeleni-posebni/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-yamal-crni-rozi": [],
  "barcelona-kobe": [
    { src: "/dresovi/barcelona-kobe/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-neymar-retro-qatar": [],
  "barcelona-raphinha": [
    { src: "/dresovi/barcelona-raphinha/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/barcelona-raphinha/back.jpg", altLabel: "Stražnja strana" }
  ],
  "dortmund-adeyemi": [
    { src: "/dresovi/dortmund-adeyemi/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/dortmund-adeyemi/back.jpg", altLabel: "Stražnja strana" }
  ],
  "atletico-griezmann": [
    { src: "/dresovi/atletico-griezmann/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/atletico-griezmann/back.jpg", altLabel: "Stražnja strana" }
  ],
  "psg-kvaratskhelia": [
    { src: "/dresovi/psg-kvaratskhelia/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/psg-kvaratskhelia/back.jpg", altLabel: "Stražnja strana" }
  ],
  "bayern-luis-diaz": [],
  "bayern-musiala-crveni": [
    { src: "/dresovi/bayern-musiala-crveni/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/bayern-musiala-crveni/back.jpg", altLabel: "Stražnja strana" }
  ],
  "real-mbappe-2526": [
    { src: "/dresovi/real-mbappe-2526/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/real-mbappe-2526/back.jpg", altLabel: "Stražnja strana" }
  ],
  "real-bellingham": [
    { src: "/dresovi/real-bellingham/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/real-bellingham/back.jpg", altLabel: "Stražnja strana" }
  ],
  "real-guler": [],
  "psg-doue-2526": [
    { src: "/dresovi/psg-doue-2526/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/psg-doue-2526/back.jpg", altLabel: "Stražnja strana" }
  ],
  "psg-doue-bijeli": [
    { src: "/dresovi/psg-doue-bijeli/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/psg-doue-bijeli/back.jpg", altLabel: "Stražnja strana" }
  ],
  "real-ronaldo-ljubicasti-cl": [
    { src: "/dresovi/real-ronaldo-ljubicasti-cl/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/real-ronaldo-ljubicasti-cl/back.jpg", altLabel: "Stražnja strana" }
  ],
  "manutd-ronaldo-crveni-ucl": [
    { src: "/dresovi/manutd-ronaldo-crveni-ucl/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/manutd-ronaldo-crveni-ucl/back.jpg", altLabel: "Stražnja strana" }
  ],
  "real-ronaldo-bijeli-cl": [
    { src: "/dresovi/real-ronaldo-bijeli-cl/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/real-ronaldo-bijeli-cl/back.jpg", altLabel: "Stražnja strana" }
  ],
  "alnassr-ronaldo-zuti": [
    { src: "/dresovi/alnassr-ronaldo-zuti/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/alnassr-ronaldo-zuti/back.jpg", altLabel: "Stražnja strana" }
  ],
  "intermiami-messi-rozi": [
    { src: "/dresovi/intermiami-messi-rozi/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/intermiami-messi-rozi/back.jpg", altLabel: "Stražnja strana" }
  ],
  "hrvatska-modric-komplet": [
    { src: "/dresovi/hrvatska-modric-komplet/komplet.jpg", altLabel: "Komplet - dres, lopta i kapa" }
  ],
  "hrvatska-modric-dres-set": [
    { src: "/dresovi/hrvatska-modric-dres-set/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/hrvatska-modric-dres-set/back.jpg", altLabel: "Stražnja strana" }
  ],
  "hrvatska-modric-lopta": [
    { src: "/dresovi/hrvatska-modric-lopta/lopta.jpg", altLabel: "Lopta Modrić nr10" }
  ],
  "hrvatska-modric-kapa": [
    { src: "/dresovi/hrvatska-modric-kapa/kapa.jpg", altLabel: "Kapa Luka Modrić" }
  ]
};

export function getJerseyGallery(slug: string) {
  return jerseyMediaMap[slug] ?? [];
}

export function hasJerseyGallery(slug: string) {
  return getJerseyGallery(slug).length > 0;
}
