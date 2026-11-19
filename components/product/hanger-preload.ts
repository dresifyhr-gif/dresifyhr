/* ------------------------------------------------------------------ */
/*  Rano učitavanje 3D vješalice (bez three.js u ovom modulu).          */
/*  - chunk s three.js: jedan zajednički Promise (import se ne ponavlja) */
/*  - slike za teksture: dekodirani <img> u memoriji, dijele ih 2D       */
/*    pozornica (pokrene ih odmah) i 3D engine (ne skida ih ponovno).    */
/*  Može se pozvati i s kartice (hover/dodir) prije otvaranja stranice.  */
/* ------------------------------------------------------------------ */

type Mod = typeof import("./three/hanger-3d");

let chunk: Promise<Mod> | null = null;

export function loadHanger3D(): Promise<Mod> {
  if (!chunk) {
    chunk = import("./three/hanger-3d");
    chunk.catch(() => {
      chunk = null; // sljedeći pokušaj smije ponovno
    });
  }
  return chunk;
}

const imgs = new Map<string, Promise<HTMLImageElement>>();

/** Skine i dekodira sliku (jednom po URL-u). Niski prioritet → ne smeta LCP slici. */
export function hangerImage(src: string, low = true): Promise<HTMLImageElement> {
  let p = imgs.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      if (low) (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
      img.onload = () => {
        // decode() unaprijed → upload teksture ne čeka dekodiranje na glavnoj niti
        img.decode().then(() => resolve(img), () => resolve(img));
      };
      img.onerror = () => {
        imgs.delete(src);
        reject(new Error(`hanger image failed: ${src}`));
      };
      img.src = src;
    });
    p.catch(() => undefined);
    imgs.set(src, p);
  }
  return p;
}

/** Chunk + slike za zadane izvore (npr. s kartice proizvoda). */
export function prefetchHanger3D(srcs: string[] = []) {
  if (typeof window === "undefined") return;
  void loadHanger3D().catch(() => undefined);
  for (const s of srcs) void hangerImage(s);
}
