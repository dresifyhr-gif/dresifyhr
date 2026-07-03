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
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d0d] p-8">
        <div className="mb-1 text-lg font-bold tracking-wide text-white">
          DRES<span className="text-accent">IFY</span> <span className="text-white/40">ADMIN</span>
        </div>
        <p className="mb-6 text-sm text-white/50">Prijava u interni dashboard.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Lozinka"
          autoFocus
          className="w-full rounded-lg border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-accent/50"
        />
        {error && <p className="mt-2 text-xs text-red-400">Kriva lozinka.</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-accent py-3 text-sm font-bold text-black disabled:opacity-60"
        >
          {loading ? "..." : "Uđi"}
        </button>
      </form>
    </div>
  );
}
