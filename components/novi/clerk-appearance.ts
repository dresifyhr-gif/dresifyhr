/* NOVI DIZAJN — izgled Clerk prijave/registracije (samo kad je zastavica uključena; rute
   /prijava i /registracija ga predaju komponenti tek u grani `NOVI_DIZAJN`). Clerk komponente
   i tok prijave ostaju isti — samo boje i obrub: crna ploha, tanke crte, limeta za glavni gumb.
   Clerkov naslov ("Prijavite se na <ime aplikacije>") se skriva: ime aplikacije se postavlja u
   Clerk nadzornoj ploči, a stranica ima svoj naslov. */
export const NOVI_CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#e8ff3c",
    colorTextOnPrimaryBackground: "#0a0a0a",
    colorBackground: "#0a0a0a",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.6)",
    colorInputBackground: "#0a0a0a",
    colorInputText: "#ffffff",
    colorNeutral: "#ffffff",
    colorDanger: "#ff5a5a",
    borderRadius: "4px",
    fontFamily: "var(--font-barlow), system-ui, sans-serif"
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full max-w-none shadow-none border border-white/10 rounded-[4px]",
    card: "bg-[#0a0a0a] shadow-none",
    header: "hidden",
    footer: "bg-[#0a0a0a] [background-image:none]",
    formButtonPrimary: "shadow-none font-semibold uppercase tracking-[0.08em]",
    socialButtonsBlockButton: "border-white/15 shadow-none",
    formFieldInput: "border-white/15 shadow-none"
  }
};
