"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Bot, MessageCircle } from "lucide-react";

import { WHATSAPP_URL } from "@/lib/site";

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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Bok! 👋 Mogu li ti pomoći pronaći pravi dres?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

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

  return (
    <>
      {/* Toggle button — replaces WhatsApp button, same position/style */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-[4px] border border-white/10 bg-accent text-black shadow-[0_18px_40px_rgba(232,255,60,0.25)] transition-transform duration-200 ease-out hover:-translate-y-1 sm:bottom-6 sm:right-6 md:h-auto md:w-auto md:gap-3 md:px-4 md:py-3"
        aria-label="Otvori chat asistenta"
      >
        <span className="flex h-16 w-16 items-center justify-center md:h-11 md:w-11 md:bg-black/10">
          {open ? <X className="h-7 w-7 shrink-0 md:h-5 md:w-5" /> : <Bot className="h-7 w-7 shrink-0 md:h-5 md:w-5" />}
        </span>
        <span className="hidden md:block">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-black/70">
            AI asistent
          </span>
          <span className="block font-heading text-xl uppercase tracking-[0.16em] text-black">
            Pitaj me nešto
          </span>
        </span>
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#0d0d0d] shadow-[0_24px_64px_rgba(0,0,0,0.7)] sm:bottom-28 sm:right-6">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-[#111] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Dresify asistent</p>
              <p className="text-[11px] text-white/40">Pomažem pronaći pravi dres</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex max-h-[340px] flex-col gap-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-[12px] px-3.5 py-2.5 text-sm leading-6 ${
                    m.role === "user" ? "bg-accent text-black" : "bg-white/8 text-white/85"
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
                <div className="rounded-[12px] bg-white/8 px-3.5 py-2.5 text-white/85">
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
          <div className="border-t border-white/10 p-3">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pitaj nešto…"
                disabled={loading}
                className="h-10 flex-1 rounded-[8px] border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-accent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-accent text-black transition hover:bg-[#f0ff71] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-white/35 transition hover:text-white/60"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Radije na WhatsApp →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
