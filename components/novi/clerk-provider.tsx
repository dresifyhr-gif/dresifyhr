"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  NOVI DIZAJN — ClerkProvider kao KLIJENTSKA komponenta (brzina).      */
/*  Isto ponašanje kao serverski <ClerkProvider localization={hrHR}> u   */
/*  app/layout.tsx (on bez `dynamic` samo spoji env i iscrta klijentski  */
/*  provider), ali hrvatski prijevod (~79 kB) više ne ide kroz RSC        */
/*  payload SVAKE stranice, a ni u JS koji se preuzima prije prvog        */
/*  iscrtavanja: zaseban chunk (@clerk/localizations/hr-HR, ~31 kB gzip)  */
/*  dolazi kad je preglednik slobodan. Prijevod treba samo Clerkovo        */
/*  sučelje (prijava/registracija/račun), koje ionako čeka clerk-js (sam  */
/*  se učitava asinkrono); na tim rutama prijevod krene odmah.            */
/*  Promjenu `localization` nakon montiranja clerk-react prenosi sam      */
/*  (useEffect → clerk.__unstable__updateProps), pa nema ponovnog učitavanja. */
/* ------------------------------------------------------------------ */

type Localization = typeof import("@clerk/localizations/hr-HR").hrHR;

let cached: Localization | undefined;
let pending: Promise<Localization> | undefined;
const loadHr = () =>
  (pending ??= import("@clerk/localizations/hr-HR").then((m) => (cached = m.hrHR)));

/** Rute na kojima se odmah prikazuje Clerkovo sučelje → prijevod bez čekanja. */
const AUTH = /^\/(prijava|registracija|racun)(\/|$)/;

type Props = {
  children: ReactNode;
  signInUrl: string;
  signUpUrl: string;
  signInFallbackRedirectUrl: string;
  signUpFallbackRedirectUrl: string;
};

export function NoviClerkProvider({ children, ...urls }: Props) {
  const path = usePathname() ?? "/";
  const [localization, setLocalization] = useState<Localization | undefined>(cached);

  useEffect(() => {
    if (localization) return;
    let off = false;
    const go = () => {
      loadHr()
        .then((l) => !off && setLocalization(l))
        .catch(() => {
          pending = undefined; // sljedeći pokušaj (npr. nova ruta) ponovno
        });
    };
    if (AUTH.test(path)) {
      go();
      return () => {
        off = true;
      };
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let id = 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    const idle = () => {
      if (w.requestIdleCallback) id = w.requestIdleCallback(go, { timeout: 4000 });
      else t = setTimeout(go, 1500);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
    return () => {
      off = true;
      window.removeEventListener("load", idle);
      if (id && w.cancelIdleCallback) w.cancelIdleCallback(id);
      if (t) clearTimeout(t);
    };
  }, [localization, path]);

  return (
    <ClerkProvider localization={localization} {...urls}>
      {children}
    </ClerkProvider>
  );
}
