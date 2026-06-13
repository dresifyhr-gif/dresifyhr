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
  "barcelona-yamal-rozo": [
    { src: "/dresovi/barcelona-yamal-rozo/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/barcelona-yamal-rozo/back.jpg", altLabel: "Stražnja strana" }
  ],
  "italija-zeleni-posebni": [
    { src: "/dresovi/italija-zeleni-posebni/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-kobe": [
    { src: "/dresovi/barcelona-kobe/front.jpg", altLabel: "Prednja strana" }
  ],
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
  "real-guler": [],
  "real-ronaldo-ljubicasti-cl": [
    { src: "/dresovi/real-ronaldo-ljubicasti-cl/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/real-ronaldo-ljubicasti-cl/back.jpg", altLabel: "Stražnja strana" }
  ],
  "real-ronaldo-bijeli-cl": [
    { src: "/dresovi/real-ronaldo-bijeli-cl/front.jpg", altLabel: "Prednja strana" },
    { src: "/dresovi/real-ronaldo-bijeli-cl/back.jpg", altLabel: "Stražnja strana" }
  ],
  "alnassr-ronaldo-zuti": [
    { src: "/dresovi/alnassr-ronaldo-zuti/adult.jpg", altLabel: "Odrasli — dres" },
    { src: "/dresovi/alnassr-ronaldo-zuti/front.jpg", altLabel: "Djeca — komplet s hlačicama" }
  ],
  "alnassr-ronaldo-home": [
    { src: "/dresovi/alnassr-ronaldo-home/adult.jpg", altLabel: "Odrasli — dres" },
    { src: "/dresovi/alnassr-ronaldo-home/front.jpg", altLabel: "Djeca — komplet s hlačicama" }
  ],
  "barcelona-yamal-se-plavi": [
    { src: "/dresovi/barcelona-yamal-se-plavi/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-raphinha-zeleni": [
    { src: "/dresovi/barcelona-raphinha-zeleni/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-raphinha-crni": [
    { src: "/dresovi/barcelona-raphinha-crni/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-yamal-plavi": [
    { src: "/dresovi/barcelona-yamal-plavi/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-messi-cl-berlin": [
    { src: "/dresovi/barcelona-messi-cl-berlin/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-neymar-retro-qatar": [
    { src: "/dresovi/barcelona-neymar-retro-qatar/front.jpg", altLabel: "Prednja strana" }
  ],
  "barcelona-yamal-crni-rozi": [
    { src: "/dresovi/barcelona-yamal-crni-rozi/front.jpg", altLabel: "Prednja strana" }
  ],
  "chelsea-palmer": [
    { src: "/dresovi/chelsea-palmer/front.jpg", altLabel: "Prednja strana" }
  ],
  "francuska-zidane-sp1998": [
    { src: "/dresovi/francuska-zidane-sp1998/front.jpg", altLabel: "Prednja strana" }
  ],
  "intermiami-messi-rozi": [
    { src: "/dresovi/intermiami-messi-rozi/front.jpg", altLabel: "Prednja strana" }
  ],
  "intermiami-messi-crni": [
    { src: "/dresovi/intermiami-messi-crni/front.jpg", altLabel: "Prednja strana" }
  ],
  "manutd-ronaldo-crveni-ucl": [
    { src: "/dresovi/manutd-ronaldo-crveni-ucl/front.jpg", altLabel: "Prednja strana" }
  ],
  "milan-modric": [
    { src: "/dresovi/milan-modric/adult.jpg", altLabel: "Odrasli — dres" },
    { src: "/dresovi/milan-modric/front.jpg", altLabel: "Djeca — komplet s hlačicama" }
  ],
  "real-bellingham": [
    { src: "/dresovi/real-bellingham/front.jpg", altLabel: "Prednja strana" }
  ],
  "real-bellingham-narancasti": [
    { src: "/dresovi/real-bellingham-narancasti/front.jpg", altLabel: "Prednja strana" }
  ],
  "real-mbappe-bijeli-2026": [
    { src: "/dresovi/real-mbappe-bijeli-2026/adult.jpg", altLabel: "Odrasli — dres" },
    { src: "/dresovi/real-mbappe-bijeli-2026/front.jpg", altLabel: "Djeca — komplet s hlačicama" }
  ],
  "real-ronaldo-balmain": [
    { src: "/dresovi/real-ronaldo-balmain/front.jpg", altLabel: "Prednja strana" }
  ],
  "real-ronaldo-2014": [
    { src: "/dresovi/real-ronaldo-2014/front.jpg", altLabel: "Prednja strana" }
  ],
  "real-ronaldo-2018": [
    { src: "/dresovi/real-ronaldo-2018/front.jpg", altLabel: "Prednja strana" }
  ],
  "bih-bajraktarevic": [
    { src: "/dresovi/bih-bajraktarevic/front.jpg", altLabel: "Prednja strana" }
  ],
  "bih-dzeko": [
    { src: "/dresovi/bih-dzeko/front.jpg", altLabel: "Prednja strana" }
  ],
  "brazil-neymar-domaci": [
    { src: "/dresovi/brazil-neymar-domaci/front.jpg", altLabel: "Prednja strana" }
  ],
  "brazil-ronaldinho-posebni": [
    { src: "/dresovi/brazil-ronaldinho-posebni/front.jpg", altLabel: "Prednja strana" }
  ],
  "brazil-vinitjr": [
    { src: "/dresovi/brazil-vinitjr/front.jpg", altLabel: "Prednja strana" }
  ],
  "brazil-vinitjr-plavi": [
    { src: "/dresovi/brazil-vinitjr-plavi/front.jpg", altLabel: "Prednja strana" }
  ],
  "brasil-kaka-crni": [
    { src: "/dresovi/brazil-kaka-crni/front.jpg", altLabel: "Prednja strana" }
  ],
  "hrvatska-modric-2026": [
    { src: "/dresovi/hrvatska-modric-2026/adult.jpg", altLabel: "Odrasli — dres" },
    { src: "/dresovi/hrvatska-modric-2026/front.jpg", altLabel: "Djeca — komplet s hlačicama" }
  ],
  "argentina-messi-retro": [
    { src: "/dresovi/argentina-messi-retro/adult.jpg", altLabel: "Odrasli — dres" },
    { src: "/dresovi/argentina-messi-retro/front.jpg", altLabel: "Djeca — komplet s hlačicama" }
  ],
  "njemacka-wirtz": [
    { src: "/dresovi/njemacka-wirtz/front.jpg", altLabel: "Prednja strana" }
  ],
  "psg-doue-crni": [
    { src: "/dresovi/psg-doue-crni/front.jpg", altLabel: "Prednja strana" }
  ],
  "psg-doue-bijeli": [
    { src: "/dresovi/psg-doue-bijeli/front.jpg", altLabel: "Prednja strana" }
  ],
  "psg-doue-2526": [
    { src: "/dresovi/psg-doue-2526/front.jpg", altLabel: "Prednja strana" }
  ],
  "portugal-ronaldo-crveni": [
    { src: "/dresovi/portugal-ronaldo-crveni/front.jpg", altLabel: "Prednja strana" }
  ],
  "santos-neymar-bijeli": [
    { src: "/dresovi/santos-neymar-bijeli/front.jpg", altLabel: "Prednja strana" }
  ],
  "bayern-kane-crveni": [
    { src: "/dresovi/bayern-kane-crveni/adult.jpg", altLabel: "Odrasli — dres" },
    { src: "/dresovi/bayern-kane-crveni/front.jpg", altLabel: "Djeca — komplet s hlačicama" }
  ],
  "hrvatska-modric-komplet": [
    { src: "/dresovi/hrvatska-modric-komplet/komplet.png", altLabel: "Hrvatska Modrić komplet — dres, hlačice, lopta i kapa" }
  ],
  "portugal-ronaldo-komplet": [
    { src: "/dresovi/portugal-ronaldo-komplet/komplet.png", altLabel: "Portugal Ronaldo komplet — dres, hlačice, lopta i kapa" }
  ],
  "barcelona-yamal-komplet": [
    { src: "/dresovi/barcelona-yamal-komplet/komplet.png", altLabel: "Barcelona Yamal komplet — dres, hlačice, lopta i kapa" }
  ],
  "real-mbappe-komplet": [
    { src: "/dresovi/real-mbappe-komplet/komplet.png", altLabel: "Real Madrid Mbappé komplet — dres, hlačice, lopta i kapa" }
  ],
  "bayern-kane-komplet": [
    { src: "/dresovi/bayern-kane-komplet/komplet.png", altLabel: "Bayern Kane komplet — dres, hlačice, lopta i kapa" }
  ],
  "intermiami-messi-komplet": [
    { src: "/dresovi/intermiami-messi-komplet/komplet.png", altLabel: "Inter Miami Messi komplet — dres, hlačice, lopta i kapa" }
  ],
  "njemacka-wirtz-komplet": [
    { src: "/dresovi/njemacka-wirtz-komplet/komplet.png", altLabel: "Njemačka Wirtz komplet — dres, hlačice, lopta i kapa" }
  ],
  "milan-modric-komplet": [
    { src: "/dresovi/milan-modric-komplet/komplet.png", altLabel: "AC Milan Modrić komplet — dres, hlačice, lopta i kapa" }
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
