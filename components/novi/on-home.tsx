import { NoviCategoryLinks, NoviHome } from "./views-home";
/* NOVI DIZAJN — naslovnica, UKLJUČENO (zamjenjuje ./home.ts samo u buildu sa zastavicom). */
export const noviHome = { Home: NoviHome, CategoryLinks: NoviCategoryLinks };
export type NoviHomeApi = typeof noviHome;
