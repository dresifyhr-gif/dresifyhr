"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

import { type Locale, type Translations, translations, LOCALE_COOKIE } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === "hr" || value === "en" ? value : null;
}

function setCookieLocale(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

type LanguageProviderProps = {
  children: ReactNode;
  initialLocale: Locale;
};

export function LanguageProvider({ children, initialLocale }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Sync with cookie on mount (client may differ from server cookie read)
  useEffect(() => {
    const cookieLocale = getCookieLocale();
    if (cookieLocale && cookieLocale !== locale) {
      setLocaleState(cookieLocale);
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    setCookieLocale(next);
  };

  return (
    <LanguageContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
