"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { useLanguage } from "@/contexts/language-context";
import { useShopSettings } from "@/contexts/shop-settings-context";

const STORAGE_KEY = "dresify_announcement_hidden_until";
const ANNOUNCEMENT_OFFSET = "32px";

function getEndOfDayTimestamp() {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime();
}

// Koncept A: tanka tamna traka koja klizi (volt točkice između poruka).
// Tekst/uključenost i dalje dolaze iz Postavki (prazan tekst = zadane poruke).
export function AnnouncementBar() {
  const { t } = useLanguage();
  const { announcementActive, announcementText } = useShopSettings();
  const messages = useMemo(
    () => (announcementText ? [announcementText] : t.announcement),
    [announcementText, t.announcement]
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let hiddenUntil = 0;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      hiddenUntil = raw ? Number(raw) : 0;
    } catch {
      /* privatni način — ignoriraj */
    }
    const nextVisible = announcementActive && (!hiddenUntil || Date.now() > hiddenUntil);

    setIsVisible(nextVisible);
    document.documentElement.style.setProperty("--announcement-offset", nextVisible ? ANNOUNCEMENT_OFFSET : "0px");

    return () => {
      document.documentElement.style.setProperty("--announcement-offset", "0px");
    };
  }, [announcementActive]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(getEndOfDayTimestamp()));
    } catch {
      /* ignore */
    }
    setIsVisible(false);
    document.documentElement.style.setProperty("--announcement-offset", "0px");
  };

  if (!isVisible) return null;

  // Emojiji iz starih poruka ne pašu uz volt točkice — maknemo ih iz prikaza.
  const clean = messages.map((m) => m.replace(/^[^A-Za-z0-9ČĆŠŽĐčćšžđ]+/, "").trim()).filter(Boolean);
  // Dovoljno ponavljanja da traka bude puna i na širokom ekranu; dvije polovice za beskonačnu petlju.
  const half = Array.from({ length: Math.max(2, Math.ceil(8 / clean.length)) }, () => clean).flat();

  return (
    <div className="sticky top-0 z-50 h-8 overflow-hidden border-b border-white/10 bg-ink text-[#cfcfc8]">
      <div className="marquee h-8 items-center" aria-hidden="true">
        {[...half, ...half].map((msg, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3.5 whitespace-nowrap px-3.5 text-[10px] font-bold uppercase leading-none tracking-[0.14em]"
          >
            <i className="inline-block h-[5px] w-[5px] rounded-full bg-accent" />
            {msg}
          </span>
        ))}
      </div>
      {/* Čitačima ekrana jedna čista verzija poruka. */}
      <p className="sr-only">{clean.join(" · ")}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-0 top-0 inline-flex h-8 w-9 items-center justify-center bg-ink text-white/50 transition-colors hover:text-white"
        aria-label="Zatvori obavijest"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
