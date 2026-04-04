"use client";

import { FormEvent, useState } from "react";

const STORAGE_KEY = "dresify_newsletter_emails";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!isValidEmail) {
      setMessage("Unesi ispravnu email adresu.");
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    const list = stored ? (JSON.parse(stored) as string[]) : [];
    const nextList = Array.from(new Set([...list, trimmedEmail]));

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
    setEmail("");
    setMessage("Prijava uspješna. Javljamo ti se kad stigne novi drop.");
  };

  return (
    <section className="section-pad bg-[#111111]">
      <div className="page-shell">
        <div className="border border-accent/30 bg-[#0a0a0a] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <span className="section-kicker">Newsletter</span>
              <h2 className="section-title">Budi prvi koji sazna za nove dresove i akcije.</h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Upiši email adresu"
                className="h-14 flex-1 rounded-[4px] border border-white/10 bg-[#111111] px-5 text-sm text-white outline-none transition duration-200 ease-out focus:border-accent"
              />
              <button type="submit" className="button-primary px-7">
                Prijavi se
              </button>
            </form>
          </div>
          {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
        </div>
      </div>
    </section>
  );
}
