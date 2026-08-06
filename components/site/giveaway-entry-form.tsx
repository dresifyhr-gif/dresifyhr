"use client";

import { useState } from "react";
import { Instagram, Check } from "lucide-react";

export function GiveawayEntryForm() {
  const [handle, setHandle] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading" || !handle.trim()) return;
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/giveaway/entry/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle })
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok) {
        setState("done");
      } else {
        setState("error");
        setMsg(d?.message || "Greška. Pokušaj ponovno.");
      }
    } catch {
      setState("error");
      setMsg("Greška u mreži. Pokušaj ponovno.");
    }
  }

  if (state === "done") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-[16px] border border-accent/40 bg-accent/[0.08] px-6 py-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-black">
          <Check className="h-6 w-6" />
        </div>
        <div className="text-lg font-bold text-white">U igri si! 🎉</div>
        <p className="text-sm text-white/60">
          Zabilježili smo <b className="text-accent">@{handle.replace(/^@+/, "")}</b>. Svaka kupnja ti daje +5 listića i veće šanse.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md">
      <div className="flex items-center gap-2 rounded-[12px] border border-white/12 bg-[#141414] px-3 focus-within:border-accent">
        <Instagram className="h-5 w-5 shrink-0 text-white/40" />
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="tvoj_instagram"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
        />
        <button
          type="submit"
          disabled={state === "loading" || !handle.trim()}
          className="my-1.5 shrink-0 rounded-[9px] bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-95 disabled:opacity-50"
        >
          {state === "loading" ? "…" : "Uđi"}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-center text-sm text-red-400">{msg}</p>}
      <p className="mt-2 text-center text-xs text-white/40">
        Prvo zaprati <b className="text-white/70">@dresify.hr</b>, pa upiši svoj Instagram da uđeš u nagradnu igru.
      </p>
    </form>
  );
}
