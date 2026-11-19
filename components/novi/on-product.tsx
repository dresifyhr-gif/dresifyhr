import { NoviProduct } from "./views-product";
/* NOVI DIZAJN — stranica dresa, UKLJUČENO (zamjenjuje ./product.ts samo u buildu sa zastavicom). */
export const noviProduct = { Product: NoviProduct };
export type NoviProductApi = typeof noviProduct;
