"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Profile = { username: string; avatar: string | null };

function Avatar({ profile, size = 56 }: { profile: Profile; size?: number }) {
  const a = profile.avatar || "";
  const isImg = a.startsWith("http") || a.startsWith("/");
  if (isImg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={a} alt={profile.username} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-slate-900 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {a || profile.username.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/profiles/")
      .then((r) => r.json())
      .then((d) => setProfiles(Array.isArray(d?.profiles) ? d.profiles : []))
      .catch(() => setProfiles([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch("/api/admin/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selected ? { username: selected.username, password } : { password })
    });
    setLoading(false);
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setError(true);
    }
  }

  const hasProfiles = profiles && profiles.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--a-surface-2)] px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--a-line)] bg-[var(--a-card)] p-8 shadow-sm">
        <div className="mb-1 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-slate-900 text-sm font-bold text-white">
            D<span className="text-lime-400">R</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--a-text)]">Dresify Admin</span>
        </div>

        {/* Faza 1: izbor profila (ako ih ima i nijedan nije odabran) */}
        {hasProfiles && !selected ? (
          <>
            <p className="mb-5 text-sm text-[var(--a-text-3)]">Odaberi svoj profil.</p>
            <div className="grid grid-cols-2 gap-3">
              {profiles!.map((p) => (
                <button
                  key={p.username}
                  onClick={() => {
                    setSelected(p);
                    setError(false);
                    setPassword("");
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--a-line)] bg-[var(--a-surface-2)] p-4 transition hover:border-slate-400 hover:bg-[var(--a-card)]"
                >
                  <Avatar profile={p} />
                  <span className="text-sm font-semibold text-[var(--a-text)]">{p.username}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Faza 2: unos lozinke (za odabrani profil ILI bootstrap stara lozinka) */
          <form onSubmit={submit}>
            {selected ? (
              <div className="mb-5 flex items-center gap-3">
                <Avatar profile={selected} size={44} />
                <div>
                  <div className="text-sm font-semibold text-[var(--a-text)]">{selected.username}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setError(false);
                    }}
                    className="text-xs text-[var(--a-text-3)] underline"
                  >
                    promijeni profil
                  </button>
                </div>
              </div>
            ) : (
              <p className="mb-5 text-sm text-[var(--a-text-3)]">Prijava u interni dashboard.</p>
            )}
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
        )}
      </div>
    </div>
  );
}
