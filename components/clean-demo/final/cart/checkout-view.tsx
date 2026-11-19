"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, CircleAlert, Gift, Loader2, Truck } from "lucide-react";

import { eurNb } from "@/components/site/cart-ui";
import { cn } from "@/lib/utils";

import { CART_PAGE, CATALOG_PAGE } from "./cart-css";
import { useCartText } from "./cart-i18n";
import { CartLinesList, CodReminder, SumLine, TotalLine } from "./cart-lines";
import { FOREIGN_PHONE_MSG, isForeignPhone, useCheckout } from "./use-checkout";

/* ------------------------------------------------------------------ */
/*  DEMO FINAL — blagajna. Jedan čisti stupac (Podaci → Dostava →       */
/*  Potvrda) i ljepljivi sažetak desno na računalu. Na mobitelu je      */
/*  sažetak sklopiv na vrhu, a gumb na kraju obrasca.                   */
/* ------------------------------------------------------------------ */

function Steps({ active, done }: { active: number; done: boolean[] }) {
  const T = useCartText();
  const STEPS = T.steps;
  return (
    <ol className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] sm:gap-3 sm:text-[12px] sm:tracking-[0.14em]" aria-label={T.stepsLabel}>
      {STEPS.map((s, i) => {
        const isDone = done[i];
        const on = i === active;
        return (
          <li key={s} className="flex items-center gap-2 sm:gap-3" aria-current={on ? "step" : undefined}>
            <span className={cn("flex items-center gap-2 transition-colors", on ? "text-white" : isDone ? "text-white/70" : "text-white/35")}>
              <span
                className={cn(
                  "flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[11px] tabular-nums transition-colors",
                  isDone ? "border-[#e8ff3c] bg-[#e8ff3c] text-[#0a0a0a]" : on ? "border-white text-white" : "border-white/25 text-white/40"
                )}
              >
                {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              {s}
            </span>
            {i < STEPS.length - 1 ? <span aria-hidden className={cn("h-px w-4 sm:w-10", isDone ? "bg-[#e8ff3c]/60" : "bg-white/15")} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Section({ n, title, children, aside }: { n: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-t border-white/[0.08] pt-6 lg:pt-8">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="c-display flex items-baseline gap-3 text-[34px] text-white lg:text-[40px]">
          <span className="text-[18px] text-white/30 lg:text-[20px]">{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, hint, error, children, className }: { id: string; label: string; hint?: string; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="c-label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] leading-5 text-[#ff8a8a]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] leading-5 text-white/40">{hint}</p>
      ) : null}
    </div>
  );
}

export function CheckoutView({ emptyFallback }: { emptyFallback?: ReactNode } = {}) {
  const c = useCheckout();
  const T = useCartText();
  const { form, set } = c;
  const [mounted, setMounted] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-[80svh]" aria-busy="true" />;

  if (!c.hasCartItems) {
    // prava ruta /checkout: bez košarice ostaje živi ručni upis narudžbe (isti payload kao prije)
    if (emptyFallback) return <>{emptyFallback}</>;
    return (
      <div className="c-in mx-auto flex max-w-[520px] flex-col items-center px-4 pb-24 pt-16 text-center lg:pt-24">
        <h1 className="c-display text-[72px] text-white lg:text-[104px]">{T.checkout}</h1>
        <p className="mt-4 text-[16px] leading-7 text-white/55">{T.checkoutEmpty}</p>
        <Link href={CATALOG_PAGE} className="c-cta mt-9 max-w-[340px]">
          {T.browse}
          <ArrowRight className="mb-[3px] h-5 w-5" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  const phoneDigits = form.phone.replace(/\D/g, "");
  const foreign = isForeignPhone(form.phone);
  const podaciOk = form.name.trim().length > 1 && phoneDigits.length >= 8 && !foreign && /\S+@\S+\.\S+/.test(form.email);
  const dostavaOk = !!form.street.trim() && !!form.houseNumber.trim() && !!form.city.trim() && /^\d{5}$/.test(form.postalCode.trim());
  const active = !podaciOk ? 0 : !dostavaOk ? 1 : 2;
  const shipText = c.freeShipping ? T.free : eurNb(c.shipping);
  const submitText = T.submit(eurNb(c.total));

  const submitBtn = (cls: string) => (
    <button type="submit" disabled={c.loading} className={cn("c-cta !h-auto min-h-[58px] py-3 !text-[21px] leading-[1.05]", cls)}>
      {c.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="[text-wrap:balance]">{submitText}</span>}
    </button>
  );

  const errorBox = c.error ? (
    <div role="alert" className="flex items-start gap-2.5 rounded-[6px] border border-[#ff6b6b]/40 bg-[#ff6b6b]/[0.07] px-4 py-3 text-[14px] leading-5 text-[#ffb3b3]">
      <CircleAlert className="mt-px h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span>{c.error}</span>
    </div>
  ) : null;

  const sums = (
    <div className="space-y-2">
      <SumLine label={T.subtotal} value={eurNb(c.orderSubtotal)} />
      {c.discount > 0 ? <SumLine label={T.discount} value={`−${eurNb(c.discount)}`} accent /> : null}
      <SumLine label={T.shipping} value={shipText} accent={c.freeShipping} />
    </div>
  );

  return (
    <form onSubmit={c.submit} className="mx-auto max-w-[1280px] px-4 pb-28 pt-7 sm:px-6 lg:px-10 lg:pb-28 lg:pt-14">
      {/* honeypot — ljudi ga ne vide, botovi ga popune (server tada tiho odbije) */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={c.hp} onChange={(e) => c.setHp(e.target.value)} className="absolute left-[-9999px] h-0 w-0 opacity-0" />

      <div className="c-in flex flex-col gap-5 pb-6 lg:flex-row lg:items-end lg:justify-between lg:pb-8">
        <h1 className="c-display text-[64px] text-white sm:text-[84px] lg:text-[112px]">{T.checkout}</h1>
        <div className="lg:pb-4">
          <Steps active={active} done={[podaciOk, dostavaOk, false]} />
        </div>
      </div>

      {/* mobitel: sklopivi sažetak narudžbe */}
      <div className="mb-6 rounded-[8px] border border-white/[0.1] bg-[#0f0f0f] lg:hidden">
        <button type="button" onClick={() => setSummaryOpen((v) => !v)} aria-expanded={summaryOpen} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 text-left">
          <span className="text-[14px] text-white/75">
            {T.yourOrder} <span className="text-white/40">· {T.items(c.itemCount)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="c-price text-[24px] text-white">{eurNb(c.total)}</span>
            <ChevronDown className={cn("h-5 w-5 text-white/50 transition-transform", summaryOpen && "rotate-180")} strokeWidth={1.6} />
          </span>
        </button>
        {summaryOpen ? (
          <div className="border-t border-white/[0.08] px-4 pb-4">
            <CartLinesList items={c.items} readOnly />
            <div className="border-t border-white/[0.08] pt-3">{sums}</div>
            <Link href={CART_PAGE} className="mt-2 inline-flex h-11 items-center text-[13px] text-white/60 underline decoration-white/20 underline-offset-4">
              {T.editCart}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
        <div className="min-w-0 space-y-10">
          <Section n="01" title={T.steps[0]}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label={T.name} className="sm:col-span-2">
                <input id="name" className="c-field" type="text" autoComplete="name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={T.namePh} />
              </Field>
              <Field id="phone" label={T.phone} hint={T.phoneHint} error={foreign ? FOREIGN_PHONE_MSG : null}>
                <input id="phone" className="c-field" type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder={T.phonePh} aria-invalid={foreign || undefined} />
                {c.klub ? (
                  <div className="mt-2 rounded-[6px] border border-[#e8ff3c]/25 bg-[#e8ff3c]/[0.05] px-3 py-2">
                    {c.klub.hasReward ? (
                      <p className="flex items-start gap-2 text-[13px] font-medium text-[#e8ff3c]">
                        <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                        <span>{T.klubReward}</span>
                      </p>
                    ) : (
                      <>
                        <p className="flex items-start gap-2 text-[13px] text-white/70">
                          <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e8ff3c]" strokeWidth={1.75} />
                          <span>
                            Dresify Klub: <b className="text-[#e8ff3c]">{c.klub.inCycle}/{c.klub.target}</b> — {T.klubLeft(c.klub.remaining)}
                          </span>
                        </p>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[#e8ff3c] transition-[width]" style={{ width: `${Math.round((c.klub.inCycle / c.klub.target) * 100)}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </Field>
              <Field id="email" label={T.email} hint={T.emailHint}>
                <input id="email" className="c-field" type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={T.emailPh} />
              </Field>
            </div>
          </Section>

          <Section n="02" title={T.steps[1]}>
            <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-4">
              <Field id="street" label={T.street}>
                <input id="street" className="c-field" type="text" autoComplete="address-line1" required value={form.street} onChange={(e) => set("street", e.target.value)} placeholder={T.streetPh} />
              </Field>
              <Field id="houseNumber" label={T.houseNo}>
                <input id="houseNumber" className="c-field" type="text" autoComplete="off" required value={form.houseNumber} onChange={(e) => set("houseNumber", e.target.value)} placeholder="12b" />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-[128px_minmax(0,1fr)] gap-4">
              <Field id="postalCode" label={T.postal}>
                <input id="postalCode" className="c-field" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={5} autoComplete="postal-code" required value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="10000" />
              </Field>
              <Field id="city" label={T.city}>
                <input id="city" className="c-field" type="text" autoComplete="address-level2" required value={form.city} onChange={(e) => set("city", e.target.value)} placeholder={T.cityPh} />
              </Field>
            </div>

            {/* jedini način: dostava na adresu, plaćanje pouzećem */}
            <div className="mt-5 flex items-center gap-4 rounded-[8px] border border-[#e8ff3c]/40 bg-[#e8ff3c]/[0.04] px-4 py-3.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[5px] border-[#e8ff3c]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-white">{T.deliveryOpt}</p>
                <p className="mt-0.5 text-[13px] text-white/50">{T.deliverySub}</p>
              </div>
              <span className={cn("shrink-0 text-[15px] font-semibold tabular-nums", c.freeShipping ? "text-[#e8ff3c]" : "text-white")}>{shipText}</span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-[12.5px] text-white/40">
              <Truck className="h-[14px] w-[14px]" strokeWidth={1.6} />
              {T.onlyHr}
            </p>

            <Field id="note" label={T.note} className="mt-6">
              <input id="note" className="c-field" type="text" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder={T.notePh} />
            </Field>
          </Section>

          <Section n="03" title={T.steps[2]}>
            <div className="space-y-4">
              {/* PS5 nagradna igra — neobavezno IG polje (živo: contact-form), ide u payload kao igHandle */}
              <Field id="igHandle" label={T.ig} hint={T.igHint}>
                <input id="igHandle" className="c-field" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.igHandle} onChange={(e) => set("igHandle", e.target.value)} placeholder={T.igPh} />
              </Field>
              {!c.signedIn ? (
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[14px] text-white/75">
                  <input type="checkbox" checked={c.remember} onChange={(e) => c.setRemember(e.target.checked)} className="h-5 w-5 shrink-0 accent-[#e8ff3c]" />
                  {T.remember}
                </label>
              ) : null}

              <div>
                {c.rewardActive ? (
                  <div className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="text-[#e8ff3c]">{c.promoMessage}</span>
                    <button type="button" onClick={c.clearPromo} className="h-11 text-[13px] text-white/55 underline underline-offset-4">
                      {T.removeCode}
                    </button>
                  </div>
                ) : promoOpen || c.promoInput || c.promoMessage ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        aria-label={T.promo}
                        className="c-field uppercase"
                        value={c.promoInput}
                        onChange={(e) => c.setPromoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void c.applyPromo();
                          }
                        }}
                        placeholder={T.promo}
                      />
                      <button type="button" onClick={() => void c.applyPromo()} className="h-[52px] shrink-0 rounded-[6px] border border-white/20 px-5 text-[14px] font-medium text-white transition-colors hover:border-white/40">
                        {T.apply}
                      </button>
                    </div>
                    {c.promoMessage ? <p className="mt-2 text-[13px] text-white/60">{c.promoMessage}</p> : null}
                  </>
                ) : (
                  <button type="button" onClick={() => setPromoOpen(true)} className="h-11 text-[14px] text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white">
                    {T.havePromo}
                  </button>
                )}
              </div>

              {/* mobitel: iznos + gumb na kraju obrasca */}
              <div className="space-y-4 lg:hidden">
                <div className="border-t border-white/[0.08] pt-4">{sums}</div>
                <TotalLine total={c.total} size={44} />
                {errorBox}
                {submitBtn("")}
                <CodReminder />
              </div>
              <p className="hidden text-[13.5px] leading-6 text-white/50 lg:block">
                {T.confirmHint}
              </p>
            </div>
          </Section>
        </div>

        {/* računalo: ljepljivi sažetak s jedinim gumbom */}
        <aside className="hidden lg:block">
          <div className="sticky top-[100px] rounded-[10px] border border-white/[0.08] bg-[#0f0f0f] p-7">
            <div className="flex items-baseline justify-between">
              <h2 className="c-display text-[30px] text-white/90">{T.order}</h2>
              <Link href={CART_PAGE} className="text-[13px] text-white/50 underline decoration-white/20 underline-offset-4 hover:text-white">
                {T.edit}
              </Link>
            </div>
            <div className="c-scroll mt-2 max-h-[38vh] overflow-y-auto pr-1">
              <CartLinesList items={c.items} readOnly />
            </div>
            <div className="mt-2 border-t border-white/[0.08] pt-4">{sums}</div>
            <div className="mt-4">
              <TotalLine total={c.total} size={52} />
            </div>
            <div className="mt-5 space-y-3">
              {errorBox}
              {submitBtn("")}
              <CodReminder />
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
