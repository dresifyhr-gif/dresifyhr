"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch("/api/admin/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    setLoading(false);
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--a-surface-2)] px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[var(--a-line)] bg-[var(--a-card)] p-8 shadow-sm">
        <div className="mb-1 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-slate-900 text-sm font-bold text-white">
            D<span className="text-lime-400">R</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--a-text)]">Dresify Admin</span>
        </div>
        <p className="mb-6 text-sm text-[var(--a-text-3)]">Prijava u interni dashboard.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Lozinka"
          autoFocus
          className="w-full rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-4 py-3 text-sm text-[var(--a-text)] outline-none transition focus:border-slate-400 focus:bg-[var(--a-card)]"
        />
        {error && <p className="mt-2 text-xs text-red-500">Kriva lozinka.</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-[12px] bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "..." : "Uđi"}
        </button>
      </form>
    </div>
  );
}
