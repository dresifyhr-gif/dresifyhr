"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Što danas trebam napraviti?",
  "Gdje gubim novac?",
  "Što trebam naručiti?",
  "Koji proizvod raste, koji pada?",
  "Kako povećati profit ovaj mjesec?",
  "Otkaži narudžbu za …"
];

export function AdminAiChat({ fill = false }: { fill?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        <Image src="/dresify-ai.png" alt="Dresify AI" width={28} height={28} className="h-7 w-7 object-contain" />
        <span className="text-sm font-semibold text-slate-800">Direktor AI</span>
      </div>

      <div className={`overflow-y-auto px-5 py-4 ${fill ? "flex-1" : "max-h-80 min-h-[3rem]"}`}>
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">Pitaj me bilo što o svom shopu — brojke, prodaji, kupcima, prijedlozima.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    msg.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {msg.content || (loading ? "…" : "")}
                </div>
              </div>
            ))}
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
