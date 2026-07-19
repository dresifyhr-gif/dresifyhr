"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Truck } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/contexts/language-context";
import { PROMO_STORAGE_KEY } from "@/components/site/promo-capture";
import {
  COD_FEE_EUR,
  FREE_SHIPPING_THRESHOLD_EUR,
  HOME_DELIVERY_PRICE_EUR,
  JERSEY_PRICE_EUR
} from "@/lib/site";
import { createCartOrderSummary, formatEuroAmount, repairText } from "@/lib/utils";
import { fbTrack } from "@/lib/fbpixel";
import { computePromoDiscount, GIFT_STORAGE_KEY, type PromoCode } from "@/lib/promo";
import type { FulfillmentType } from "@/lib/orders";

type FulfillmentOption = {
  id: FulfillmentType;
  label: string;
  description: string;
  price: number;
  Icon: typeof Truck;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  fulfillment: FulfillmentType;
  street: string;
  city: string;
  postalCode: string;
  manualDetails: string;
  note: string;
};


// Svjetlija (tamno siva, ne bijela) polja + upisani tekst u neon žutoj (tema).
const inputClass =
  "w-full rounded-[8px] border border-white/15 bg-[#1f1f1f] px-4 py-3 text-sm font-medium text-accent caret-accent placeholder:font-normal placeholder:text-white/35 outline-none transition duration-150 focus:border-accent/60 focus:bg-[#262626] focus:ring-1 focus:ring-accent/20";

function StepLabel({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-[10px] font-bold text-accent">
        {number}
      </span>
      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">{title}</span>
    </div>
  );
}


// Provjera popust-koda ide na server jer kodovi žive u bazi (admin ih uređuje).
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

export function ContactForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const { items, subtotal, itemCount, clearCart } = useCart();

  const FULFILLMENT_OPTIONS: FulfillmentOption[] = [
    {
      id: "delivery",
      label: t.contactForm.deliveryCod,
      description: t.contactForm.deliveryCodDesc,
      price: HOME_DELIVERY_PRICE_EUR + COD_FEE_EUR,
      Icon: Truck
    }
  ];

  const hasCartItems = items.length > 0;
  const autoDetails = createCartOrderSummary(items);
  const cartSummaryText = items
    .map((item, i) => `${i + 1}. ${repairText(item.klub)} — ${repairText(item.igrac)}, ${item.size}, ${item.segmentLabel}`)
    .join("\n");

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    fulfillment: "delivery",
    street: "",
    city: "",
    postalCode: "",
    manualDetails: "",
    note: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [autoPromoTried, setAutoPromoTried] = useState(false);
  const [hasGift, setHasGift] = useState(false);
  // Dresify Klub: napredak po broju mobitela (bez prijave).
  const [klub, setKlub] = useState<{ inCycle: number; target: number; remaining: number; available: { code: string; label: string }[] } | null>(null);

  const needsAddress = form.fulfillment === "delivery";
  const selectedOption = FULFILLMENT_OPTIONS.find((o) => o.id === form.fulfillment)!;
  const orderSubtotal = hasCartItems ? subtotal : JERSEY_PRICE_EUR;
  // A free-shipping reward (e.g. DOSTAVA) zeros shipping when its minimum is met.
  // GOL15/GOL20 require €80/€100, so the classic €60 threshold already covers them.
  const promoFreeShipping =
    appliedPromo?.kind === "freeship" && orderSubtotal >= appliedPromo.minSubtotal;
  // Streetwear ima besplatnu dostavu.
  const hasStreetwear = items.some((i) => i.category === "streetwear");
  const freeShipping =
    orderSubtotal >= FREE_SHIPPING_THRESHOLD_EUR || promoFreeShipping || hasStreetwear;
  const shipping = freeShipping ? 0 : selectedOption.price;
  const discount = computePromoDiscount(appliedPromo, orderSubtotal);
  const total = orderSubtotal - discount + shipping;
  // A reward is "active" if it gives a discount OR free shipping.
  const rewardActive = !!appliedPromo && (discount > 0 || promoFreeShipping);

  // Kodovi žive u bazi (uređuju se u adminu) → provjera ide na server.
  async function applyPromo() {
    const result = await checkPromo(promoInput, orderSubtotal);
    if (result.ok) {
      setAppliedPromo(result.promo);
      setPromoMessage(
        result.promo.kind === "freeship"
          ? "Besplatna dostava primijenjena 🎉"
          : `Popust primijenjen — ušteda ${formatEuroAmount(result.discount)}`
      );
    } else if (result.reason === "min_not_met" && result.promo) {
      setAppliedPromo(null);
      setPromoMessage(`Ovaj kod vrijedi za narudžbe od ${formatEuroAmount(result.promo.minSubtotal)}.`);
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

  // Check for quiz gift reward
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(GIFT_STORAGE_KEY)) setHasGift(true);
  }, []);

  // Pre-fill + auto-apply a promo code captured from a URL link (e.g. Instagram)
  useEffect(() => {
    if (autoPromoTried || appliedPromo) return;
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PROMO_STORAGE_KEY);
    if (!stored) return;
    let cancelled = false;
    (async () => {
    const result = await checkPromo(stored, orderSubtotal);
    if (cancelled) return;
    if (result.ok) {
      setPromoInput(result.promo.code);
      setAppliedPromo(result.promo);
      setPromoMessage(
        result.promo.kind === "freeship"
          ? "Besplatna dostava primijenjena 🎉"
          : `Popust primijenjen — ušteda ${formatEuroAmount(result.discount)}`
      );
      setAutoPromoTried(true);
    } else if (orderSubtotal > 0) {
      // Cart loaded but below minimum — pre-fill the field so the customer sees it
      setPromoInput(stored);
    }
    })();
    return () => { cancelled = true; };
  }, [autoPromoTried, appliedPromo, orderSubtotal]);

  // Napredak u Klubu čim broj ima dovoljno znamenki.
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8) { setKlub(null); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const d = await fetch(`/api/klub/progress/?phone=${encodeURIComponent(form.phone)}`).then((r) => r.json());
        if (!cancelled) setKlub(d?.ok ? d : null);
      } catch { if (!cancelled) setKlub(null); }
    }, 450);
    return () => { cancelled = true; clearTimeout(id); };
  }, [form.phone]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const details = hasCartItems ? autoDetails : form.manualDetails;

    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        street: needsAddress ? form.street : undefined,
        city: needsAddress ? form.city : undefined,
        postalCode: needsAddress ? form.postalCode : undefined,
        details,
        cartSummary: cartSummaryText || undefined,
        contactChannel: "web",
        fulfillment: form.fulfillment,
        payment: "Pouzeće",
        note: [hasGift ? "🎁 POKLON IZ KVIZA" : "", form.note].filter(Boolean).join(" · ") || undefined,
        subtotal: orderSubtotal,
        shipping,
        total,
        discount: discount > 0 ? discount : undefined,
        promoCode: rewardActive && appliedPromo ? appliedPromo.code : undefined,
        itemCount: hasCartItems ? itemCount : 1,
        items: hasCartItems
          ? items.map((item) => ({
              slug: item.slug,
              klub: repairText(item.klub),
              igrac: repairText(item.igrac),
              size: item.size,
              segment: item.segment,
              unitPrice: item.price
            }))
          : undefined,
        createdAt: new Date().toISOString()
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message ?? t.contactForm.errorGeneral);
        return;
      }

      fbTrack("Purchase", {
        content_ids: hasCartItems ? items.map((item) => item.slug) : undefined,
        content_type: "product",
        value: total,
        currency: "EUR",
        num_items: hasCartItems ? itemCount : 1
      });

      clearCart();
      try { localStorage.removeItem(GIFT_STORAGE_KEY); } catch {}
      try { localStorage.removeItem(PROMO_STORAGE_KEY); } catch {}
      router.push("/zahvala");
    } catch {
      setError(t.contactForm.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* LEFT */}
      <div className="space-y-4">

        {/* Step 1 — Kontakt */}
        <div className="panel p-5 sm:p-7">
          <StepLabel number="1" title={t.contactForm.step1} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
                {t.contactForm.name}
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Luka Horvat"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
                {t.contactForm.phone}
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="+385 91 234 5678"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
              {klub && (
                <div className="mt-2 rounded-[8px] border border-accent/30 bg-accent/[0.07] px-3 py-2">
                  {klub.available.length > 0 ? (
                    <p className="text-[13px] font-semibold text-accent">
                      🎁 Imaš nagradu! Upiši kod <span className="font-mono">{klub.available[0].code}</span> ispod.
                    </p>
                  ) : (
                    <>
                      <p className="text-[13px] text-white/70">
                        🎁 Dresify Klub: <b className="text-accent">{klub.inCycle}/{klub.target}</b> — još {klub.remaining} do gratis nagrade
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round((klub.inCycle / klub.target) * 100)}%` }} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
                {t.contactForm.email}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="luka@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Step 2 — Dostava */}
        <div className="panel p-5 sm:p-7">
          <StepLabel number="2" title={t.contactForm.step2} />
          <div className="grid gap-3 sm:grid-cols-2">
            {FULFILLMENT_OPTIONS.map(({ id, label, description, price, Icon }) => {
              const active = form.fulfillment === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set("fulfillment", id)}
                  className={`relative flex items-start gap-3 rounded-[10px] border p-4 text-left transition-all duration-150 ${
                    active
                      ? "border-accent/50 bg-accent/8 ring-1 ring-accent/20"
                      : "border-white/12 bg-[#1f1f1f] hover:border-white/25"
                  }`}
                >
                  {active && (
                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent" />
                  )}
                  <span className={`mt-0.5 shrink-0 ${active ? "text-accent" : "text-white/30"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${active ? "text-white" : "text-white/55"}`}>
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-white/35">{description}</p>
                    <p className={`mt-2 text-sm font-bold ${active ? "text-accent" : "text-white/30"}`}>
                      {price === 0 ? t.contactForm.free : formatEuroAmount(price)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {needsAddress && (
            <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div className="sm:col-span-2">
                <label htmlFor="street" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
                  {t.contactForm.street}
                </label>
                <input
                  id="street"
                  type="text"
                  autoComplete="street-address"
                  required
                  placeholder="Ilica 1"
                  value={form.street}
                  onChange={(e) => set("street", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="city" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
                  {t.contactForm.city}
                </label>
                <input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  required
                  placeholder="Zagreb"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
                  {t.contactForm.zip}
                </label>
                <input
                  id="postalCode"
                  type="text"
                  autoComplete="postal-code"
                  required
                  placeholder="10000"
                  value={form.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Note field — only show here */}
          <div className="mt-5 border-t border-white/6 pt-5">
            <label htmlFor="note" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
              {t.contactForm.note}
            </label>
            <input
              id="note"
              type="text"
              placeholder={t.contactForm.notePlaceholder}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Manual order — only if cart is empty */}
        {!hasCartItems && (
          <div className="panel p-5 sm:p-7">
            <StepLabel number="3" title={t.contactForm.step3} />
            <textarea
              required
              rows={4}
              placeholder={t.contactForm.orderPlaceholder}
              value={form.manualDetails}
              onChange={(e) => set("manualDetails", e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-[8px] border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            <span className="mt-0.5 shrink-0">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Mobile submit */}
        <button type="submit" disabled={loading} className="button-primary w-full xl:hidden">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="inline-flex items-center gap-2">
              {t.contactForm.submit} <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </button>
      </div>

      {/* RIGHT — summary */}
      <aside className="h-fit xl:sticky xl:top-24">
        <div className="panel overflow-hidden p-5 sm:p-6">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
            {t.contactForm.orderSummary}
          </p>

          {hasCartItems ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{repairText(item.klub)}</p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {repairText(item.igrac)} · {item.size} · {item.segmentLabel}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-accent">{formatEuroAmount(item.price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/35">{t.contactForm.cartEmpty}</p>
          )}

          <div className="mt-5 space-y-2.5 border-t border-white/8 pt-5 text-sm">
            <div className="flex items-center justify-between text-white/50">
              <span>{t.contactForm.items}</span>
              <span>{formatEuroAmount(hasCartItems ? subtotal : JERSEY_PRICE_EUR)}</span>
            </div>
            <div className="flex items-center justify-between text-white/50">
              <span>{t.contactForm.shipping}</span>
              <span>{shipping === 0 ? t.contactForm.free : formatEuroAmount(shipping)}</span>
            </div>

            {/* Gift reward from quiz */}
            {hasGift && (
              <div className="flex items-center gap-2 rounded-[6px] border border-accent/30 bg-accent/8 px-3 py-2 text-sm text-accent">
                <span>🎁</span>
                <span>Poklon iznenađenja aktiviran — prilaže se uz narudžbu</span>
              </div>
            )}

            {/* Promo code */}
            {rewardActive && discount > 0 ? (
              <div className="flex items-center justify-between text-accent">
                <span>Popust (-{appliedPromo!.value}%)</span>
                <span>-{formatEuroAmount(discount)}</span>
              </div>
            ) : null}
            {rewardActive && promoFreeShipping ? (
              <div className="flex items-center justify-between text-accent">
                <span>Besplatna dostava 🎉</span>
                <span>-{formatEuroAmount(selectedOption.price)}</span>
              </div>
            ) : null}

            <div className="pt-1">
              {rewardActive ? (
                <button
                  type="button"
                  onClick={clearPromo}
                  className="text-[12px] text-white/45 underline transition hover:text-white"
                >
                  Ukloni promo kod
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="password"
                    autoComplete="off"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Promo kod"
                    className="h-10 flex-1 rounded-[6px] border border-white/10 bg-[#0d0d0d] px-3 text-sm uppercase tracking-[0.3em] text-white placeholder:tracking-normal placeholder:text-white/25 outline-none focus:border-accent/50"
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    className="h-10 shrink-0 rounded-[6px] border border-accent/40 bg-accent/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-accent transition hover:bg-accent/20"
                  >
                    Primijeni
                  </button>
                </div>
              )}
              {promoMessage ? (
                <p className={`mt-2 text-[12px] ${rewardActive ? "text-accent" : "text-white/45"}`}>
                  {promoMessage}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-white/8 pt-3">
              <span className="font-heading text-lg uppercase tracking-wide text-white">{t.contactForm.total}</span>
              <span className="font-heading text-2xl text-accent">{formatEuroAmount(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary mt-6 hidden w-full xl:inline-flex"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-2">
                {t.contactForm.submit} <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>

          <p className="mt-4 text-center text-[11px] leading-5 text-white/25">
            {t.contactForm.confirmNote}
          </p>
        </div>
      </aside>
    </form>
  );
}
