"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { SOCIAL_PROOF_MESSAGES } from "@/lib/site";
import { getInitials } from "@/lib/utils";

type ActivePopup = {
  id: number;
  message: string;
};

const LAST_SHOWN_KEY = "dresify_social_proof_last_shown";
const MIN_DELAY_MS = 10 * 60 * 1000;
const MAX_EXTRA_DELAY_MS = 2 * 60 * 1000;
const VISIBLE_DURATION_MS = 4500;

function getNextDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * MAX_EXTRA_DELAY_MS);
}

export function SocialProofPopup() {
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let messageId = 0;

    const clearTimers = () => {
      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current);
      }

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };

    const schedulePopup = (delay: number) => {
      showTimerRef.current = window.setTimeout(() => {
        const message =
          SOCIAL_PROOF_MESSAGES[Math.floor(Math.random() * SOCIAL_PROOF_MESSAGES.length)];

        messageId += 1;
        setActivePopup({ id: messageId, message });
        window.localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));

        hideTimerRef.current = window.setTimeout(() => {
          setActivePopup((current) => (current?.id === messageId ? null : current));
        }, VISIBLE_DURATION_MS);

        schedulePopup(getNextDelay());
      }, delay);
    };

    const lastShown = Number(window.localStorage.getItem(LAST_SHOWN_KEY) || 0);
    const elapsed = Date.now() - lastShown;
    const initialDelay = lastShown && elapsed < MIN_DELAY_MS ? MIN_DELAY_MS - elapsed : getNextDelay();

    schedulePopup(initialDelay);

    return clearTimers;
  }, []);

  return (
    <AnimatePresence>
      {activePopup ? (
        <motion.div
          key={activePopup.id}
          initial={{ opacity: 0, x: -24, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -24, y: 12 }}
          className="fixed bottom-4 left-4 z-40 max-w-[320px] rounded-[8px] border border-white/10 bg-[#111111]/95 p-4 shadow-[0_22px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:bottom-6 sm:left-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-black text-sm font-semibold text-accent">
              {getInitials(activePopup.message.split(" ")[0] ?? "DK")}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-accent">Upravo kupljeno</p>
              <p className="mt-2 text-sm leading-6 text-white/82">{activePopup.message}</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
