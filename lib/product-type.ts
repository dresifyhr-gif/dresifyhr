// Vrsta proizvoda — JEDAN izvor istine za tekstove (naslovi, meta opis, schema,
// feedovi). Prije je "nogometni dres" bio tvrdo upisan u schemu i za komplete,
// trenirke i streetwear.

type ProductKind = { category?: string; liga?: string };

// Kratka riječ: "dres", "komplet", "trenirka"…
export function productTypeWord(p: ProductKind): string {
  if (p.category === "streetwear") return "streetwear komplet";
  // Trenirka prije Kompleta (kao u productTypeDescription/Category): neke trenirke
  // iz admina imaju liga "Komplet" (npr. argentina-messi-nr10).
  if (p.category === "trenirka") return "trenirka";
  if (p.liga === "Komplet") return "komplet";
  if (p.category === "dugi-rukav") return "dres dugih rukava";
  return "dres";
}

// Duži opis za meta description / schema description.
export function productTypeDescription(p: ProductKind): string {
  if (p.category === "streetwear") return "streetwear komplet";
  if (p.category === "trenirka") return "trenirka (jakna + hlače)";
  if (p.liga === "Komplet") return "komplet (dres, hlačice, lopta i kapa)";
  if (p.category === "dugi-rukav") return "dres dugih rukava";
  return "nogometni dres";
}

// Kategorija za schema.org Product.category.
export function productTypeCategory(p: ProductKind): string {
  if (p.category === "streetwear") return "Streetwear";
  // Trenirka prije Kompleta, isto kao productTypeDescription: neke trenirke iz
  // admina imaju liga "Komplet" (npr. argentina-messi-nr10), a schema description
  // i category moraju opisivati istu stvar.
  if (p.category === "trenirka") return "Trenirke";
  if (p.liga === "Komplet") return "Nogometni kompleti";
  return "Nogometni dresovi";
}
