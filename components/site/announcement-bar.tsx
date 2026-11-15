"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { useLanguage } from "@/contexts/language-context";
import { useShopSettings } from "@/contexts/shop-settings-context";
import { daysLeft, deadlineLabel } from "@/lib/christmas";

const STORAGE_KEY = "dresify_announcement_hidden_until";
const ANNOUNCEMENT_OFFSET = "40px";

function getEndOfDayTimestamp() {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime();
}

export function AnnouncementBar() {
  const { t } = useLanguage();
  // Traka se pali/gasi i tekst se mijenja u Postavkama (prazan tekst = zadane poruke).
  const { announcementActive, announcementText, christmasOn, christmasDeadline } = useShopSettings();
  const messages = useMemo(
    () => (announcementText ? [announcementText] : t.announcement),
    [announcementText, t.announcement]
  );
  const [isVisible, setIsVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const hiddenUntilRaw = window.localStorage.getItem(STORAGE_KEY);
    const hiddenUntil = hiddenUntilRaw ? Number(hiddenUntilRaw) : 0;
    const nextVisible = (christmasOn || announcementActive) && (!hiddenUntil || Date.now() > hiddenUntil);

    setIsVisible(nextVisible);
    document.documentElement.style.setProperty(
      "--announcement-offset",
      nextVisible ? ANNOUNCEMENT_OFFSET : "0px"
    );

    return () => {
      document.documentElement.style.setProperty("--announcement-offset", "0px");
    };
  }, [announcementActive, christmasOn]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [isVisible, messages.length]);

  const currentMessage = useMemo(() => messages[messageIndex % messages.length], [messageIndex, messages]);
  // Dani do roka računaju se tek u pregledniku (server nema "danas" kupca).
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => { if (christmasOn) setLeft(daysLeft(christmasDeadline)); }, [christmasOn, christmasDeadline]);

  const handleDismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, String(getEndOfDayTimestamp()));
    setIsVisible(false);
    document.documentElement.style.setProperty("--announcement-offset", "0px");
  };

  return (
    <AnimatePresence initial={false}>
      {isVisible ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={christmasOn ? "xmas-bar sticky top-0 z-50 text-white" : "sticky top-0 z-50 border-b border-black/10 bg-accent text-black"}
        >
          <div className="page-shell relative flex h-10 items-center justify-center pr-10 sm:h-11 sm:pr-12">
            {christmasOn ? (
              <p className="flex items-center gap-2.5 whitespace-nowrap text-[12px] font-semibold sm:gap-3 sm:text-[13px]">
                <span className="hidden text-[10.5px] font-extrabold tracking-[0.22em] text-[#E3B85C] sm:inline">BOŽIĆ S DRESIFYJEM</span>
                <span className="hidden opacity-30 sm:inline">|</span>
                {left === 0 ? (
                  <span>Narudžbe sada stižu nakon Božića · plaćaš pouzećem</span>
                ) : (
                  <span>Naruči do <b>{deadlineLabel(christmasDeadline)}</b> — stiže pod bor</span>
                )}
                {left ? (
                  <span className="rounded-full border border-[#E3B85C] px-2 py-0.5 text-[10.5px] font-extrabold text-[#E3B85C]">
                    još {left} {left === 1 ? "dan" : "dana"}
                  </span>
                ) : null}
              </p>
            ) : (
            <AnimatePresence mode="wait">
              <motion.p
                key={currentMessage}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="truncate text-center text-[11px] font-semibold tracking-[0.02em] sm:text-[13px]"
              >
                {currentMessage}
              </motion.p>
            </AnimatePresence>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className={`absolute right-3 inline-flex h-8 w-8 items-center justify-center transition-all duration-200 ease-out sm:right-6 ${christmasOn ? "text-white/60 hover:text-white" : "text-black/70 hover:text-black"}`}
              aria-label="Zatvori obavijest"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
