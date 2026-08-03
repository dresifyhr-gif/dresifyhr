"use client";

import { useEffect, useState } from "react";

type Address = {
  id: string;
  label: string | null;
  name: string;
  phone: string | null;
  street: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
};

const empty = { label: "", name: "", phone: "", street: "", city: "", postalCode: "" };

export function AddressManager() {
  const [items, setItems] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/account/addresses/").then((x) => x.json());
      if (r?.ok) setItems(r.addresses as Address[]);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch("/api/account/addresses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      await load();
    } catch {}
    setBusy(false);
  }

  async function add() {
    if (!form.name || !form.street || !form.city || !form.postalCode) return;
    await post({ action: "add", ...form });
    setForm(empty);
    setAdding(false);
  }

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const inp = "w-full rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent/50";

  if (loading) return <div className="text-sm text-white/40">Učitavam…</div>;

  return (
    <div className="space-y-3">
      {items.length === 0 && !adding && (
        <div className="py-4 text-center text-sm text-white/50">Još nemaš spremljenih adresa.</div>
      )}

      {items.map((a) => (
        <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold">
              {a.label || "Adresa"}
              {a.isDefault && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">ZADANA</span>}
            </div>
            <div className="mt-0.5 text-[13px] text-white/70">{a.name}{a.phone ? ` · ${a.phone}` : ""}</div>
            <div className="text-[13px] text-white/50">{a.street}, {a.postalCode} {a.city}</div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {!a.isDefault && (
              <button type="button" disabled={busy} onClick={() => post({ action: "default", id: a.id })} className="text-[11px] font-semibold text-accent hover:underline">
                Postavi kao zadanu
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => post({ action: "delete", id: a.id })} className="text-[11px] text-white/40 hover:text-red-400">
              Obriši
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.label} onChange={set("label")} placeholder="Naziv (npr. Kuća)" className={inp} />
            <input value={form.phone} onChange={set("phone")} placeholder="Telefon" className={inp} />
          </div>
          <input value={form.name} onChange={set("name")} placeholder="Ime i prezime *" className={inp} />
          <input value={form.street} onChange={set("street")} placeholder="Ulica i kućni broj *" className={inp} />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input value={form.city} onChange={set("city")} placeholder="Grad *" className={inp} />
            <input value={form.postalCode} onChange={set("postalCode")} placeholder="Poštanski *" className={`${inp} w-28`} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" disabled={busy} onClick={add} className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
              {busy ? "Spremam…" : "Spremi adresu"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setForm(empty); }} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60">
              Odustani
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="w-full rounded-xl border border-dashed border-white/15 py-2.5 text-sm font-semibold text-white/70 transition hover:border-accent/40 hover:text-accent">
          + Dodaj adresu
        </button>
      )}
    </div>
  );
}
