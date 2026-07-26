"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "dresify_cookie_ok";

// Informativna obavijest o kolačićima (opcija A): jedan gumb "U redu", tracking
// se nastavlja. Nema lažnog "Odbij" koji ionako ne bi ništa gasio — to bi bilo
// gore od nepostojanja bannera. Puna pravila su na /pravila-privatnosti.
//
// Brzina: fiksno na dnu, PUNA (neprozirna) pozadina bez backdrop-blura —
// blur na fiksnoj plohi izaziva ponovni izračun stila svaki frame (vidi memoriju).
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* privatni način rada — ne prikazuj da ne smeta */
    }
  }, []);

  function accept() {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-[#0d0d0d] px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-5 text-white/70">
          Koristimo kolačiće za osnovni rad stranice, analitiku i marketing kako bismo poboljšali iskustvo.
          Nastavkom korištenja pristaješ na njih.{" "}
          <Link href="/pravila-privatnosti/" className="text-accent underline underline-offset-2 hover:text-white">
            Saznaj više
          </Link>
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-[8px] bg-accent px-5 py-2 text-[13px] font-bold text-black transition-opacity hover:opacity-90"
        >
          U redu
        </button>
      </div>
    </div>
  );
}
