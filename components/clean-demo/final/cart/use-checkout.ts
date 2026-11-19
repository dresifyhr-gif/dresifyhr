"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";

import { useCart } from "@/components/providers/cart-provider";
import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";
import { eur } from "@/components/ui/premium";
import { useLanguage } from "@/contexts/language-context";
import { fbTrack, readCookie } from "@/lib/fbpixel";
import type { FulfillmentType } from "@/lib/orders";
import { computePromoDiscount, GIFT_STORAGE_KEY, type PromoCode } from "@/lib/promo";
import { COD_FEE_EUR, FREE_SHIPPING_THRESHOLD_EUR, HOME_DELIVERY_PRICE_EUR } from "@/lib/site";
import { createCartOrderSummary, repairText } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  DEMO blagajna — ISTA logika narudžbe kao živi obrazac               */
/*  (components/contact/contact-form.tsx): isti /api/orders payload,     */
/*  honeypot, blok stranog broja, samo pouzeće, dostava 6 + 1 = 7 €,     */
/*  besplatna dostava / kodovi samo za prijavljene, prefill iz profila   */
/*  i "zapamti podatke" za goste. Ovdje je samo izdvojena iz prikaza.    */
/*  Polje Instagram (PS5 → igHandle) i napredak u Klubu kao živo.        */
/*  Razlika: nema ručnog upisa bez košarice (prazna košarica = poruka).  */
/*  Svjesno NIJE izvučeno u zajednički hook: contact-form.tsx je živa     */
/*  datoteka i mora ostati bajt-identična dok je NOVI_DIZAJN isključen.  */
/*  Jednakost payloada provjerava test (scratchpad integ/order-payload). */
/* ------------------------------------------------------------------ */

export type CheckoutForm = {
  name: string;
  phone: string;
  email: string;
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  note: string;
  /** PS5 nagradna igra — neobavezno (živo: contact-form igHandle) */
  igHandle: string;
};

export type KlubProgress = { inCycle: number; target: number; remaining: number; hasReward: boolean };

type PromoCheck =
  | { ok: true; promo: PromoCode; discount: number }
  | { ok: false; reason: "not_found" | "min_not_met" | "expired" | "used_up"; promo?: PromoCode };

async function checkPromo(code: string, subtotal: number): Promise<PromoCheck> {
  try {
    const d = await fetch(`/api/promo/validate/?code=${encodeURIComponent(code)}&subtotal=${subtotal}`).then((r) => r.json());
    if (d?.ok) return { ok: true, promo: d.promo as PromoCode, discount: Number(d.discount) || 0 };
    return { ok: false, reason: d?.reason || "not_found", promo: d?.promo || undefined };
  } catch {
    return { ok: false, reason: "not_found" };
  }
}

/** Isto pravilo kao živi obrazac: strani pozivni broj (osim +385) se zaustavlja. */
export function isForeignPhone(phone: string) {
  const n = phone.replace(/[\s\-()./]/g, "");
  return /^(\+|00)/.test(n) && !/^(\+385|00385)/.test(n);
}

export const FOREIGN_PHONE_MSG = "Zasad dostavljamo samo unutar Hrvatske. Za narudžbu upiši hrvatski broj (npr. 091 234 5678).";

const fulfillment: FulfillmentType = "delivery";
const DELIVERY_PRICE = HOME_DELIVERY_PRICE_EUR + COD_FEE_EUR;

export function useCheckout() {
  const router = useRouter();
  const { t } = useLanguage();
  const { items, subtotal, itemCount, clearCart } = useCart();
  const { isSignedIn, user } = useUser();
  const signedIn = isSignedIn === true;

  const [form, setForm] = useState<CheckoutForm>({ name: "", phone: "", email: "", street: "", houseNumber: "", city: "", postalCode: "", note: "", igHandle: "" });
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [hasGift, setHasGift] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [autoPromoTried, setAutoPromoTried] = useState(false);

  const hasCartItems = items.length > 0;
  const orderSubtotal = subtotal;
  const promoFreeShipping = signedIn && appliedPromo?.kind === "freeship" && orderSubtotal >= appliedPromo.minSubtotal;
  const freeShipping = (signedIn && orderSubtotal >= FREE_SHIPPING_THRESHOLD_EUR) || promoFreeShipping;
  const shipping = freeShipping ? 0 : DELIVERY_PRICE;
  const discount = signedIn ? computePromoDiscount(appliedPromo, orderSubtotal) : 0;
  const total = orderSubtotal - discount + shipping;
  const rewardActive = signedIn && !!appliedPromo && (discount > 0 || promoFreeShipping);

  // Prijavljeni: ime/email/telefon iz profila + zadana spremljena adresa (samo prazna polja).
  const prefilled = useRef(false);
  useEffect(() => {
    if (!signedIn || !user || prefilled.current) return;
    prefilled.current = true;
    const email = user.primaryEmailAddress?.emailAddress || "";
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const clerkPhone = user.primaryPhoneNumber?.phoneNumber || "";
    setForm((f) => ({ ...f, name: f.name || fullName, email: f.email || email, phone: f.phone || clerkPhone }));
    fetch("/api/account/addresses")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const a = d?.addresses?.[0];
        if (!a) return;
        const m = String(a.street || "").match(/^(.*?)[\s,]*([0-9]+\s*[a-zA-Z]?)\s*$/);
        const street = m ? m[1].trim() : String(a.street || "").trim();
        const houseNumber = m ? m[2].replace(/\s+/g, "") : "";
        setForm((f) => ({
          ...f,
          name: f.name || a.name || "",
          phone: f.phone || a.phone || "",
          street: f.street || street,
          houseNumber: f.houseNumber || houseNumber,
          city: f.city || a.city || "",
          postalCode: f.postalCode || String(a.postalCode || "").replace(/\s/g, "")
        }));
      })
      .catch(() => {});
  }, [signedIn, user]);

  // Gost: "zapamti podatke" iz browsera (isti ključ kao živa blagajna).
  const guestPrefilled = useRef(false);
  useEffect(() => {
    if (isSignedIn !== false || guestPrefilled.current) return;
    guestPrefilled.current = true;
    try {
      const raw = localStorage.getItem("dresify_guest_details");
      if (!raw) return;
      const d = JSON.parse(raw);
      setForm((f) => ({
        ...f,
        name: f.name || d.name || "",
        phone: f.phone || d.phone || "",
        email: f.email || d.email || "",
        street: f.street || d.street || "",
        houseNumber: f.houseNumber || d.houseNumber || "",
        city: f.city || d.city || "",
        postalCode: f.postalCode || String(d.postalCode || "").replace(/\s/g, "")
      }));
    } catch {}
  }, [isSignedIn]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(GIFT_STORAGE_KEY)) setHasGift(true);
    } catch {}
  }, []);

  async function applyPromo() {
    if (!signedIn) {
      setAppliedPromo(null);
      setPromoMessage("Popusti i kodovi vrijede samo za prijavljene kupce — prijavi se ili registriraj.");
      return;
    }
    const result = await checkPromo(promoInput, orderSubtotal);
    if (result.ok) {
      setAppliedPromo(result.promo);
      setPromoMessage(result.promo.kind === "freeship" ? "Besplatna dostava primijenjena." : `Popust primijenjen — ušteda ${eur(result.discount)}`);
    } else if (result.reason === "min_not_met" && result.promo) {
      setAppliedPromo(null);
      setPromoMessage(`Ovaj kod vrijedi za narudžbe od ${eur(result.promo.minSubtotal)}.`);
    } else if (result.reason === "expired") {
      setAppliedPromo(null);
      setPromoMessage("Ovaj kod je istekao.");
    } else if (result.reason === "used_up") {
      setAppliedPromo(null);
      setPromoMessage("Ovaj kod je iskorišten do kraja.");
    } else {
      setAppliedPromo(null);
      setPromoMessage("Promo kod nije ispravan.");
    }
  }

  function clearPromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMessage(null);
  }

  // Kod uhvaćen iz poveznice (npr. Instagram) — automatski se primijeni.
  useEffect(() => {
    if (autoPromoTried || appliedPromo) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(PROMO_STORAGE_KEY);
    } catch {}
    if (!stored) return;
    const code = stored;
    let cancelled = false;
    (async () => {
      const result = await checkPromo(code, orderSubtotal);
      if (cancelled) return;
      if (result.ok) {
        setPromoInput(result.promo.code);
        setAppliedPromo(result.promo);
        setPromoMessage(result.promo.kind === "freeship" ? "Besplatna dostava primijenjena." : `Popust primijenjen — ušteda ${eur(result.discount)}`);
        setAutoPromoTried(true);
      } else if (orderSubtotal > 0) {
        setPromoInput(code);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoPromoTried, appliedPromo, orderSubtotal]);

  // Napredak u Klubu čim broj ima dovoljno znamenki (isto kao živi obrazac).
  const [klub, setKlub] = useState<KlubProgress | null>(null);
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setKlub(null);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const d = await fetch(`/api/klub/progress/?phone=${encodeURIComponent(form.phone)}`).then((r) => r.json());
        if (!cancelled) setKlub(d?.ok ? d : null);
      } catch {
        if (!cancelled) setKlub(null);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [form.phone]);

  function set(field: keyof CheckoutForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!hasCartItems || loading) return;
    setError(null);
    setLoading(true);

    if (isForeignPhone(form.phone)) {
      setError(FOREIGN_PHONE_MSG);
      setLoading(false);
      return;
    }

    const cartSummaryText = items
      .map((item, i) => `${i + 1}. ${repairText(item.klub)} — ${repairText(item.igrac)}, ${item.size}, ${item.segmentLabel}`)
      .join("\n");

    try {
      const fbEventId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random()}`;
      const payload = {
        website: hp,
        name: form.name,
        phone: form.phone,
        email: form.email,
        street: `${form.street} ${form.houseNumber}`.trim(),
        city: form.city,
        postalCode: form.postalCode,
        details: createCartOrderSummary(items),
        cartSummary: cartSummaryText || undefined,
        contactChannel: "web",
        fulfillment,
        payment: "Pouzeće",
        note: [hasGift ? "🎁 POKLON IZ KVIZA" : "", form.note].filter(Boolean).join(" · ") || undefined,
        igHandle: form.igHandle || undefined,
        subtotal: orderSubtotal,
        shipping,
        total,
        discount: discount > 0 ? discount : undefined,
        promoCode: rewardActive && appliedPromo ? appliedPromo.code : undefined,
        itemCount,
        items: items.map((item) => ({
          slug: item.slug,
          klub: repairText(item.klub),
          igrac: repairText(item.igrac),
          size: item.size,
          segment: item.segment,
          unitPrice: item.price,
          ...(item.addons ? { addons: item.addons } : {})
        })),
        createdAt: new Date().toISOString(),
        fbEventId,
        fbc: readCookie("_fbc")
      };

      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? t.contactForm.errorGeneral);
        return;
      }

      fbTrack("Purchase", { content_ids: items.map((item) => item.slug), content_type: "product", value: total, currency: "EUR", num_items: itemCount }, fbEventId);

      clearCart();
      try { localStorage.removeItem(GIFT_STORAGE_KEY); } catch {}
      try { localStorage.removeItem(PROMO_STORAGE_KEY); } catch {}
      try {
        if (remember) {
          localStorage.setItem(
            "dresify_guest_details",
            JSON.stringify({ name: form.name, phone: form.phone, email: form.email, street: form.street, houseNumber: form.houseNumber, city: form.city, postalCode: form.postalCode })
          );
        } else {
          localStorage.removeItem("dresify_guest_details");
        }
      } catch {}
      try { sessionStorage.setItem("dresify_gcr", JSON.stringify({ orderId: payload.createdAt, email: form.email })); } catch {}
      router.push("/zahvala");
    } catch {
      setError(t.contactForm.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  return {
    items, itemCount, hasCartItems, signedIn,
    form, set, hp, setHp, remember, setRemember,
    loading, error, setError, submit, klub,
    orderSubtotal, shipping, freeShipping, discount, total,
    promoInput, setPromoInput, appliedPromo, promoMessage, applyPromo, clearPromo, rewardActive, promoFreeShipping,
  };
}
