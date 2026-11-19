/* Redoslijed na šipki (krug): dresovi istog kluba / reprezentacije ravnomjerno raspoređeni po cijeloj
   šipki, a dugi rukavi nikad jedan do drugoga. Prvi dres svakog kluba iz TOP najpopularnijih ostaje na svom mjestu (prvi dres šipke se ne mijenja). */

type RailLike = { slug: string; group?: string; product: { klub?: string | null } };

const TOP = 12;
/** prvih LOCK mjesta (dres u fokusu pri otvaranju i susjedi) popravak ne dira */
const LOCK = 6;

const clubKey = (it: RailLike) =>
  (it.product.klub ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(fc|cf|ac|sc|afc)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(psg|parissaintgermain)$/, "psg")
    .replace(/^(manutd|manchesterunited)$/, "manutd")
    .replace(/^(mancity|manchestercity)$/, "mancity")
    .replace(/^(intermiami|intermiamicf)$/, "intermiami") || it.slug;

const isLong = (it: RailLike) => it.group === "dugi-rukav";

/** mali deterministički hash (faza kluba na krugu) */
const phase = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

export function interleaveByClub<T extends RailLike>(list: T[]): T[] {
  const N = list.length;
  if (N < 6) return list.slice();
  const byClub = new Map<string, number[]>();
  list.forEach((it, i) => {
    const k = clubKey(it);
    byClub.set(k, [...(byClub.get(k) ?? []), i]);
  });
  // ciljni položaj: klub s n dresova → svakih N/n mjesta (faza iz imena); TOP ostaju gdje jesu
  const target = new Array<number>(N);
  for (const [k, idx] of byClub) {
    const stride = N / idx.length;
    // najpopularniji (TOP) ostaju sprijeda i u svom poretku; ostali klubovi iza njih s fazom iz imena
    const first = idx[0] < TOP ? idx[0] * 0.6 : TOP * 0.6 + phase(k) * stride;
    idx.forEach((i, j) => {
      target[i] = j === 0 ? first : first + j * stride + 0.001 * i;
    });
  }
  const order = list.map((_, i) => i).sort((a, b) => target[a] - target[b]);

  // popravak: susjed (do 2 mjesta) istog kluba ili dva duga rukava zaredom → zamijeni s prvim
  // kasnijim koji ne smeta (krug: zadnji susjeduju s prvima)
  const bad = (o: number[], p: number, i: number) => {
    for (const d of [-2, -1, 1, 2]) {
      const q = o[(((p + d) % N) + N) % N];
      if (q === undefined || q === i) continue;
      if (clubKey(list[q]) === clubKey(list[i])) return true;
      if (Math.abs(d) === 1 && isLong(list[q]) && isLong(list[i])) return true;
    }
    return false;
  };
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let p = 0; p < N; p++) {
      if (p < LOCK || !bad(order, p, order[p])) continue;
      for (let step = 1; step < N; step++) {
        const q = (p + step) % N;
        if (q < LOCK) continue;
        const a = order[p];
        const b = order[q];
        order[p] = b;
        order[q] = a;
        if (!bad(order, p, b) && !bad(order, q, a)) {
          changed = true;
          break;
        }
        order[p] = a;
        order[q] = b;
      }
    }
    if (!changed) break;
  }
  return order.map((i) => list[i]);
}
