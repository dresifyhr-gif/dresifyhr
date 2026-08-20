"use client";

import { useEffect, useState } from "react";

type TeamUser = {
  id: string;
  username: string;
  role: "OWNER" | "PARTNER" | "STAFF";
  avatar: string | null;
  active: boolean;
  lastLogin: string | null;
};

const ROLE_LABEL: Record<TeamUser["role"], string> = {
  OWNER: "Vlasnik — sve ovlasti",
  PARTNER: "Partner — narudžbe, proizvodi, reklama, poravnanje",
  STAFF: "Osoblje — narudžbe i proizvodi"
};

function Avatar({ user, size = 40 }: { user: { username: string; avatar: string | null }; size?: number }) {
  const a = user.avatar || "";
  const isImg = a.startsWith("http") || a.startsWith("/");
  if (isImg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={a} alt={user.username} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div className="flex items-center justify-center rounded-full bg-slate-900 font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {a || user.username.charAt(0).toUpperCase()}
    </div>
  );
}

const EMPTY = { username: "", password: "", role: "STAFF" as TeamUser["role"], avatar: "" };

export function TeamManager() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Record<string, { role: TeamUser["role"]; avatar: string; password: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/team/").then((x) => x.json()).catch(() => ({ users: [] }));
    setUsers(Array.isArray(r?.users) ? r.users : []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/team/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    }).then((x) => x.json());
    setBusy(false);
    if (r?.ok) {
      setForm({ ...EMPTY });
      load();
    } else {
      setMsg(r?.message || "Greška pri dodavanju.");
    }
  }

  async function save(u: TeamUser) {
    const e = editing[u.id];
    if (!e) return;
    setBusy(true);
    setMsg(null);
    const body: Record<string, unknown> = { id: u.id, role: e.role, avatar: e.avatar };
    if (e.password) body.password = e.password;
    const r = await fetch("/api/admin/team/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then((x) => x.json());
    setBusy(false);
    if (r?.ok) {
      setEditing((prev) => {
        const n = { ...prev };
        delete n[u.id];
        return n;
      });
      load();
    } else {
      setMsg(r?.message || "Greška pri spremanju.");
    }
  }

  async function toggleActive(u: TeamUser) {
    await fetch("/api/admin/team/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, active: !u.active })
    }).then((x) => x.json());
    load();
  }

  async function remove(u: TeamUser) {
    if (!confirm(`Obrisati profil "${u.username}"? Ovo se ne može poništiti.`)) return;
    await fetch(`/api/admin/team/?id=${u.id}`, { method: "DELETE" });
    load();
  }

  const inputCls =
    "rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-3 py-2 text-sm text-[var(--a-text)] outline-none focus:border-slate-400";

  return (
    <div className="mt-10 rounded-2xl border border-[var(--a-line)] bg-[var(--a-card)] p-6">
      <h2 className="text-base font-bold text-[var(--a-text)]">Tim</h2>
      <p className="mb-5 mt-1 text-sm text-[var(--a-text-3)]">
        Tko se može prijaviti u admin i s kojim ovlastima. Svi vide sve; ovlasti reguliraju samo što mogu mijenjati.
      </p>

      {loading ? (
        <p className="text-sm text-[var(--a-text-3)]">Učitavam…</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const e = editing[u.id];
            return (
              <div key={u.id} className="rounded-xl border border-[var(--a-line)] bg-[var(--a-surface-2)] p-4">
                <div className="flex items-center gap-3">
                  <Avatar user={u} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--a-text)]">{u.username}</span>
                      {!u.active && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">isključen</span>}
                    </div>
                    <div className="text-xs text-[var(--a-text-3)]">{ROLE_LABEL[u.role]}</div>
                  </div>
                  {!e && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing((p) => ({ ...p, [u.id]: { role: u.role, avatar: u.avatar || "", password: "" } }))}
                        className="rounded-[10px] border border-[var(--a-line)] px-3 py-1.5 text-xs font-semibold text-[var(--a-text)] hover:bg-[var(--a-card)]"
                      >
                        Uredi
                      </button>
                      <button onClick={() => toggleActive(u)} className="rounded-[10px] border border-[var(--a-line)] px-3 py-1.5 text-xs font-semibold text-[var(--a-text)] hover:bg-[var(--a-card)]">
                        {u.active ? "Isključi" : "Uključi"}
                      </button>
                      <button onClick={() => remove(u)} className="rounded-[10px] border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                        Obriši
                      </button>
                    </div>
                  )}
                </div>

                {e && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-[var(--a-text-3)]">
                      Uloga
                      <select value={e.role} onChange={(ev) => setEditing((p) => ({ ...p, [u.id]: { ...e, role: ev.target.value as TeamUser["role"] } }))} className={inputCls}>
                        <option value="OWNER">Vlasnik (sve)</option>
                        <option value="PARTNER">Partner (+reklama, poravnanje)</option>
                        <option value="STAFF">Osoblje (narudžbe, proizvodi)</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--a-text-3)]">
                      Slika (emoji ili URL)
                      <input value={e.avatar} onChange={(ev) => setEditing((p) => ({ ...p, [u.id]: { ...e, avatar: ev.target.value } }))} placeholder="😀 ili https://…" className={inputCls} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--a-text-3)]">
                      Nova lozinka (ostavi prazno da ne mijenjaš)
                      <input value={e.password} onChange={(ev) => setEditing((p) => ({ ...p, [u.id]: { ...e, password: ev.target.value } }))} type="text" placeholder="•••••" className={inputCls} />
                    </label>
                    <div className="flex items-end gap-2">
                      <button disabled={busy} onClick={() => save(u)} className="rounded-[10px] bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                        Spremi
                      </button>
                      <button
                        onClick={() =>
                          setEditing((p) => {
                            const n = { ...p };
                            delete n[u.id];
                            return n;
                          })
                        }
                        className="rounded-[10px] border border-[var(--a-line)] px-4 py-2 text-xs font-semibold text-[var(--a-text)]"
                      >
                        Odustani
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dodaj novi profil */}
      <form onSubmit={add} className="mt-6 rounded-xl border border-dashed border-[var(--a-line)] p-4">
        <div className="mb-3 text-sm font-semibold text-[var(--a-text)]">Dodaj profil</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Ime (npr. Nina)" className={inputCls} />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Lozinka" type="text" className={inputCls} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamUser["role"] })} className={inputCls}>
            <option value="OWNER">Vlasnik (sve)</option>
            <option value="PARTNER">Partner (+reklama, poravnanje)</option>
            <option value="STAFF">Osoblje (narudžbe, proizvodi)</option>
          </select>
          <input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="Slika: emoji ili URL (nije obavezno)" className={inputCls} />
        </div>
        {msg && <p className="mt-2 text-xs text-red-500">{msg}</p>}
        <button disabled={busy} type="submit" className="mt-3 rounded-[10px] bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {busy ? "…" : "Dodaj profil"}
        </button>
      </form>
    </div>
  );
}
