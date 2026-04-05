"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { useLanguage } from "@/contexts/language-context";

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
  const [isVisible, setIsVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const hiddenUntilRaw = window.localStorage.getItem(STORAGE_KEY);
    const hiddenUntil = hiddenUntilRaw ? Number(hiddenUntilRaw) : 0;
    const nextVisible = !hiddenUntil || Date.now() > hiddenUntil;

    setIsVisible(nextVisible);
    document.documentElement.style.setProperty(
      "--announcement-offset",
      nextVisible ? ANNOUNCEMENT_OFFSET : "0px"
    );

    return () => {
      document.documentElement.style.setProperty("--announcement-offset", "0px");
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % t.announcement.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [isVisible]);

  const currentMessage = useMemo(() => t.announcement[messageIndex], [messageIndex, t.announcement]);

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
          className="sticky top-0 z-50 border-b border-black/10 bg-accent text-black"
        >
          <div className="page-shell relative flex h-10 items-center justify-center pr-10 sm:h-11 sm:pr-12">
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

            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-3 inline-flex h-8 w-8 items-center justify-center text-black/70 transition-all duration-200 ease-out hover:text-black sm:right-6"
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
