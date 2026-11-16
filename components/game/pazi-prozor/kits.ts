// Dresovi koje dijete u igri može nositi (samo boje i uzorci, bez grbova).

import type { Kit } from "./textures";

export const KITS: Kit[] = [
  { id: "hrvatska", name: "Hrvatska", pattern: "checker", a: "#e8e6e2", b: "#d8262f", number: "10", shorts: "#f2f2f2", socks: "#1d3f8f" },
  { id: "dresify", name: "Dresify", pattern: "solid", a: "#121214", b: "#e8ff3c", number: "10", shorts: "#121214", socks: "#e8ff3c" },
  { id: "real-madrid", name: "Real Madrid", pattern: "solid", a: "#f3f1ec", b: "#c6a456", number: "7", shorts: "#f3f1ec", socks: "#f3f1ec" },
  { id: "barcelona", name: "Barcelona", pattern: "stripes", a: "#1b3c8c", b: "#a3123a", number: "10", shorts: "#1b3c8c", socks: "#1b3c8c" },
  { id: "milan", name: "Milan", pattern: "stripes", a: "#141414", b: "#d0202a", number: "9", shorts: "#f2f2f2", socks: "#141414" },
  { id: "bayern", name: "Bayern", pattern: "solid", a: "#d4142a", b: "#ffffff", number: "9", shorts: "#d4142a", socks: "#d4142a" },
  { id: "inter-miami", name: "Inter Miami", pattern: "solid", a: "#f5b6cd", b: "#111111", number: "10", shorts: "#f5b6cd", socks: "#f5b6cd" }
];

export const KIT_KEY = "dresify_pazi_dres";
export const BEST_KEY = "dresify_v2_best_pazi_prozor";

export function kitById(id: string | null | undefined) {
  return KITS.find((k) => k.id === id) ?? KITS[0];
}

const SHARE_BALLS = new Set(["hrvatska", "real-madrid", "barcelona", "milan", "bayern", "inter-miami"]);

/** Lopta za sliku rezultata (story) u bojama odabranog dresa; Dresify dres dobije hrvatsku. */
export function kitShareImage(id: string) {
  return `/mix/lopta-${SHARE_BALLS.has(id) ? id : "hrvatska"}.webp`;
}
