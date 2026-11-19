/* NOVI DIZAJN — ista build-time zastavica za KLIJENTSKE komponente ("use client").
   `@/lib/novi-dizajn` se ne smije uvesti u klijentsku komponentu (u buildu sa zastavicom vuče
   serverski components/novi/on.tsx), pa se ovdje čita NEXT_PUBLIC_NOVI_DIZAJN, koju Next
   pri buildu upiše kao konstantu: bez zastavice grana `NOVI_FLAG ? … : …` otpada iz bundlea. */
export const NOVI_FLAG = process.env.NEXT_PUBLIC_NOVI_DIZAJN === "1";
