"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Što danas trebam napraviti?",
  "Isprike za neposlane narudžbe",
  "Gdje gubim novac?",
  "Što trebam naručiti?",
  "Koji proizvod raste, koji pada?",
  "Otkaži narudžbu za …"
];

// Pretvara Markdown [tekst](url) i gole URL-ove u klikabilne linkove (npr. WhatsApp).
function renderRich(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const url = m[2] ?? m[3];
    const label = m[1] ?? m[3];
    nodes.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-emerald-600 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-700"
      >
        {label}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const STORE_KEY = "dresify-ai-chat";
const KEEP = 40; // koliko poruka čuvamo lokalno

export function AdminAiChat({ fill = false }: { fill?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Vrati prethodni razgovor (preživi zatvaranje chata, prelazak stranice i osvježavanje).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) setMessages(saved.filter((m) => m?.role && typeof m.content === "string"));
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, []);

  // Spremi razgovor nakon svake promjene (tek kad je prethodni vraćen, da ga ne pregazimo).
  useEffect(() => {
    if (!restored || loading) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-KEEP)));
    } catch {
      /* ignore */
    }
  }, [messages, restored, loading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function newChat() {
    setMessages([]);
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: acc };
          return c;
        });
      }
    } catch {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: "Greška — pokušaj ponovno." };
        return c;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${fill ? "flex h-full flex-col" : ""}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <Image src="/dresify-robot.png" alt="Dresify AI" width={40} height={40} className="h-10 w-10 object-contain" />
        <span className="text-sm font-semibold text-slate-800">Dresify AI</span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={newChat}
            title="Obriši razgovor i kreni ispočetka"
            className="ml-auto rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            🗑 Novi razgovor
          </button>
        )}
      </div>

      <div className={`overflow-y-auto px-5 py-4 ${fill ? "flex-1" : "max-h-80 min-h-[3rem]"}`}>
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">Pitaj me bilo što o svom shopu — brojke, prodaji, kupcima, prijedlozima.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="text-right">
                  <div className="inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-900 px-3.5 py-2 text-sm text-white">
                    {msg.content || (loading ? "…" : "")}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2">
                  <Image src="/dresify-robot.png" alt="AI" width={28} height={28} className="mt-0.5 h-7 w-7 shrink-0 object-contain" />
                  <div className="inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-3.5 py-2 text-sm text-slate-800">
                    {msg.content ? renderRich(msg.content) : (loading ? "…" : "")}
                  </div>
                </div>
              )
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Napiši pitanje…"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "…" : "Pošalji"}
          </button>
        </form>
      </div>
    </div>
  );
}
