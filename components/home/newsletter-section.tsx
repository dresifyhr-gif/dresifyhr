"use client";

import { FormEvent, useState } from "react";

import { useLanguage } from "@/contexts/language-context";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!isValidEmail) {
      setMessage(t.newsletter.error);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail })
      });

      if (!res.ok) {
        setMessage(t.newsletter.error);
        return;
      }

      setEmail("");
      setMessage(t.newsletter.success);
    } catch {
      setMessage(t.newsletter.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-20 lg:pt-28">
      <div className="page-shell">
        <div className="grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:pt-12">
          <div>
            <h2 className="font-display text-[36px] uppercase leading-[0.92] text-fg lg:text-[56px]">{t.newsletter.title}</h2>
            <p className="mt-2 text-[13px] font-medium leading-[1.4] text-mute">{t.newsletter.sub}</p>
          </div>
          <form onSubmit={handleSubmit} className="flex border-b-[1.5px] border-fg">
            <label htmlFor="newsletter-email" className="sr-only">
              Email
            </label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.newsletter.placeholder}
              className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-fg outline-none placeholder:text-mute2"
            />
            <button
              type="submit"
              className="shrink-0 pl-3 text-[12px] font-black uppercase tracking-[0.12em] text-fg transition-colors hover:text-accent disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "..." : t.newsletter.submit}
            </button>
          </form>
        </div>
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      </div>
    </section>
  );
}
