"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Send, Bot, MessageCircle, MessagesSquare, ChevronRight } from "lucide-react";

import { useWhatsAppUrl } from "@/contexts/shop-settings-context";

type Message = { role: "user" | "assistant"; content: string };

function renderLinks(text: string) {
  const parts = text.split(/(\[([^\]]+)\]\((https?:\/\/[^\)]+)\))/g);
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part && part.startsWith("[")) {
      const label = parts[i + 1];
      const href = parts[i + 2];
      if (label && href) {
        result.push(
          <a key={i} href={href} className="underline text-accent hover:text-white transition-colors">
            {label}
          </a>
        );
        i += 3;
        continue;
      }
    }
    if (part) result.push(<span key={i}>{part}</span>);
    i++;
  }
  return result;
}

export function ChatWidget() {
  const whatsappUrl = useWhatsAppUrl();
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // chat panel
  const [menu, setMenu] = useState(false); // izbor WhatsApp / asistent
  const [scrollHidden, setScrollHidden] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Bok! Mogu li ti pomoći pronaći pravi dres?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Klik izvan izbornika ili Escape ga zatvara.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  // Mobitel: dok kupac lista prema dolje gumb se skloni, pri listanju gore vrati.
  // (Sakrivanje je samo u CSS-u ispod md, pa na računalu ovo nema učinka.)
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (Math.abs(dy) > 8) {
          setScrollHidden(dy > 0 && y > 160);
          lastY = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Promjena stranice zatvara izbornik.
  useEffect(() => { setMenu(false); }, [pathname]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8) }),
      });

      if (!res.ok || !res.body) throw new Error("fetch failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      setMessages(m => [...m, { role: "assistant", content: "" }]);
      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: reply };
          return copy;
        });
      }
    } catch {
      setLoading(false);
      setMessages(m => [...m, { role: "assistant", content: "Ups, nešto je pošlo po krivu. Pokušaj ponovo ili nas kontaktiraj na WhatsAppu." }]);
    }
  }

  // Na košarici i narudžbi ništa ne pluta preko obrasca.
  const p = (pathname || "/").replace(/\/$/, "") || "/";
  if (p === "/kosarica" || p === "/checkout") return null;

  const anyOpen = open || menu;
  const hideLauncher = scrollHidden && !anyOpen;

  return (
    <div ref={rootRef}>
      {/* Jedan plutajući gumb: otvara izbor WhatsApp / asistent */}
      <button
        type="button"
        onClick={() => {
          if (anyOpen) { setOpen(false); setMenu(false); }
          else setMenu(true);
        }}
        aria-expanded={anyOpen}
        aria-haspopup="menu"
        aria-label={anyOpen ? "Zatvori" : "Trebaš pomoć?"}
        className={`fab fab-1 fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#111] text-accent ring-1 ring-accent/70 md:right-6 ${hideLauncher ? "fab-hide" : ""}`}
      >
        {anyOpen ? <X strokeWidth={1.75} className="h-5 w-5" /> : <MessagesSquare strokeWidth={1.5} className="h-[22px] w-[22px]" />}
      </button>

      {/* Mali izbornik iznad gumba */}
      {menu && !open && (
        <div
          role="menu"
          className="fab-panel fixed right-4 z-[45] w-[248px] overflow-hidden rounded-[14px] border border-white/10 bg-[#0d0d0d] shadow-[0_16px_40px_rgba(0,0,0,0.6)] md:right-6"
        >
          <p className="px-4 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">Trebaš pomoć?</p>
          <a
            role="menuitem"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenu(false)}
            className="flex min-h-[52px] items-center gap-3 px-4 text-[14px] font-medium text-white transition-colors hover:bg-white/[0.04]"
          >
            <MessageCircle strokeWidth={1.5} className="h-5 w-5 shrink-0 text-accent" />
            <span className="flex-1">Piši nam na WhatsApp</span>
            <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-white/30" />
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={() => { setMenu(false); setOpen(true); }}
            className="flex min-h-[52px] w-full items-center gap-3 border-t border-white/[0.06] px-4 text-left text-[14px] font-medium text-white transition-colors hover:bg-white/[0.04]"
          >
            <Bot strokeWidth={1.5} className="h-5 w-5 shrink-0 text-accent" />
            <span className="flex-1">Pitaj asistenta</span>
            <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-white/30" />
          </button>
        </div>
      )}

      {/* Chat window */}
      {open && (
        <div className="fab-panel fixed right-4 z-[45] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d] shadow-[0_24px_64px_rgba(0,0,0,0.7)] md:right-6">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#111] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Bot strokeWidth={1.5} className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Dresify asistent</p>
              <p className="text-[11px] text-white/40">Pomažem pronaći pravi dres</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Zatvori chat"
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[8px] text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex min-h-0 max-h-[340px] flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-[12px] px-3.5 py-2.5 text-sm leading-6 ${
                    m.role === "user" ? "bg-accent text-black" : "bg-white/[0.08] text-white/85"
                  }`}
                >
                  {m.role === "assistant" ? renderLinks(m.content) : m.content}
                  {m.role === "assistant" && m.content === "" && (
                    <span className="inline-flex gap-1 text-white/50">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-[12px] bg-white/[0.08] px-3.5 py-2.5 text-white/85">
                  <span className="inline-flex gap-1 text-lg text-white/50">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-white/10 p-3">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pitaj nešto…"
                disabled={loading}
                aria-label="Poruka asistentu"
                className="h-10 min-w-0 flex-1 rounded-[8px] border border-white/10 bg-white/5 px-3 text-[16px] text-white md:text-sm placeholder:text-white/30 outline-none transition focus:border-accent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Pošalji"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-accent text-black transition hover:bg-[#f0ff71] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-white/35 transition hover:text-white/60"
            >
              <MessageCircle strokeWidth={1.5} className="h-3.5 w-3.5" />
              Radije na WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
