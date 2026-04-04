"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2, MapPin, Truck } from "lucide-react";

import { useCart } from "@/components/providers/cart-provider";
import {
  COD_FEE_EUR,
  HOME_DELIVERY_PRICE_EUR,
  JERSEY_PRICE_EUR,
  ZAGREB_DELIVERY_PRICE_EUR
} from "@/lib/site";
import { createCartOrderSummary, formatEuroAmount, repairText } from "@/lib/utils";
import type { FulfillmentType } from "@/lib/orders";

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

const FULFILLMENT_OPTIONS: Array<{
  id: FulfillmentType;
  label: string;
  description: string;
  price: number;
  Icon: typeof Truck;
}> = [
  {
    id: "delivery",
    label: "Dostava pouzećem",
    description: "HP Paket24, plaćanje pri preuzimanju",
    price: HOME_DELIVERY_PRICE_EUR + COD_FEE_EUR,
    Icon: Truck
  },
  {
    id: "zagreb_delivery",
    label: "Besplatna dostava Zagreb",
    description: "Osobno dostavljamo unutar Zagreba",
    price: ZAGREB_DELIVERY_PRICE_EUR,
    Icon: MapPin
  }
];

const inputClass =
  "w-full rounded-[8px] border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition duration-150 focus:border-accent/50 focus:bg-[#111] focus:ring-1 focus:ring-accent/15";

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

export function ContactForm() {
  const router = useRouter();
  const { items, subtotal, itemCount, clearCart } = useCart();

  const hasCartItems = items.length > 0;
  const autoDetails = createCartOrderSummary(items);
  const cartSummaryText = items
    .map((item) => `${repairText(item.klub)} — ${repairText(item.igrac)}, ${item.size}, ${item.segmentLabel}`)
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

  const needsAddress = form.fulfillment === "delivery" || form.fulfillment === "zagreb_delivery";
  const selectedOption = FULFILLMENT_OPTIONS.find((o) => o.id === form.fulfillment)!;
  const shipping = selectedOption.price;
  const orderSubtotal = hasCartItems ? subtotal : JERSEY_PRICE_EUR;
  const total = orderSubtotal + shipping;

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
        note: form.note || undefined,
        subtotal: orderSubtotal,
        shipping,
        total,
        itemCount: hasCartItems ? itemCount : 1,
        createdAt: new Date().toISOString()
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message ?? "Greška pri slanju narudžbe. Pokušaj ponovo.");
        return;
      }

      clearCart();
      router.push("/zahvala");
    } catch {
      setError("Veza nije uspjela. Provjeri internet i pokušaj ponovo.");
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
          <StepLabel number="1" title="Kontakt podaci" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
                Ime i prezime
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
                Broj mobitela
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
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/40">
                Email adresa
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
          <StepLabel number="2" title="Način dostave" />
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
                      : "border-white/8 bg-[#0d0d0d] hover:border-white/20"
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
                      {price === 0 ? "Besplatno" : formatEuroAmount(price)}
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
                  Ulica i kućni broj
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
                  Grad
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
                  Poštanski broj
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
              Napomena (opcionalno)
            </label>
            <input
              id="note"
              type="text"
              placeholder="Npr. poklon pakiranje, kontakt napomena..."
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Manual order — only if cart is empty */}
        {!hasCartItems && (
          <div className="panel p-5 sm:p-7">
            <StepLabel number="3" title="Što želiš naručiti?" />
            <textarea
              required
              rows={4}
              placeholder={"Npr. Real Madrid - Bellingham, odrasli, veličina L"}
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
              POŠALJI NARUDŽBU <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </button>
      </div>

      {/* RIGHT — summary */}
      <aside className="h-fit xl:sticky xl:top-24">
        <div className="panel overflow-hidden p-5 sm:p-6">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
            Sažetak narudžbe
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
            <p className="text-sm text-white/35">Košarica je prazna — detalje upiši u koraku 3.</p>
          )}

          <div className="mt-5 space-y-2.5 border-t border-white/8 pt-5 text-sm">
            <div className="flex items-center justify-between text-white/50">
              <span>Artikli</span>
              <span>{formatEuroAmount(hasCartItems ? subtotal : JERSEY_PRICE_EUR)}</span>
            </div>
            <div className="flex items-center justify-between text-white/50">
              <span>Dostava</span>
              <span>{shipping === 0 ? "Besplatno" : formatEuroAmount(shipping)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/8 pt-3">
              <span className="font-heading text-lg uppercase tracking-wide text-white">Ukupno</span>
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
                POŠALJI NARUDŽBU <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>

          <p className="mt-4 text-center text-[11px] leading-5 text-white/25">
            Potvrđujemo dostupnost u roku sat vremena.
          </p>
        </div>
      </aside>
    </form>
  );
}
