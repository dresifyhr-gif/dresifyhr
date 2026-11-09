// Dijagonalni "DRESIFY" vodeni žig (CSS pozadina) preko slika proizvoda — ukradeni
// screenshotovi postaju neupotrebljivi. Zaseban modul (ne "use client") da ga mogu
// koristiti i server komponente.
export const WATERMARK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='170'%3E%3Ctext x='0' y='95' font-family='Arial,sans-serif' font-weight='700' font-size='26' fill='rgba(0,0,0,0.07)' transform='rotate(-28 130 85)'%3EDRESIFY%3C/text%3E%3C/svg%3E\")";

// Blaža varijanta (koncept A): veća pločica, jedva vidljivo — samo preko studijske
// fotografije u galeriji proizvoda, nikad preko kartica ni heroja.
export const WATERMARK_SOFT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='280'%3E%3Ctext x='40' y='160' font-family='Arial,sans-serif' font-weight='700' font-size='30' fill='rgba(0,0,0,0.035)' transform='rotate(-28 210 140)'%3EDRESIFY%3C/text%3E%3C/svg%3E\")";
