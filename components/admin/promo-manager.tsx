"use client";

import { useCallback, useEffect, useState } from "react";

type Code = {
  code: string;
  kind: string;
  value: number;
  minSubtotal: number;
  label: string;
  active: boolean;
  expiresAt: string;
  maxUses: number | "";
  note: string;
  uses: number;
  discountGiven: number;
};

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")} €`;
const inp = "a-input w-full px-3 py-2 text-sm";
const lbl = "a-label mb-1 block";

const empty = { code: "", kind: "percent", value: "10", minSubtotal: "0", label: "", active: true, expiresAt: "", maxUses: "", note: "" };

export function PromoManager() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [f, setF] = useState({ ...empty });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetch("/api/admin/promo-codes/").then((r) => r.json()).catch(() => null);
    if (d?.ok) setCodes(d.codes);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function edit(c: Code) {
    setF({
      code: c.code, kind: c.kind, value: String(c.value), minSubtotal: String(c.minSubtotal),
      label: c.label, active: c.active, expiresAt: c.expiresAt, maxUses: String(c.maxUses ?? ""), note: c.note
    });
    setOpen(true);
    setErr("");
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setErr("");
    const d = await fetch("/api/admin/promo-codes/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f)
    }).then((r) => r.json()).catch(() => null);
    setSaving(false);
    if (!d?.ok) { setErr(d?.message || "Greška pri spremanju"); return; }
    setF({ ...empty });
    setOpen(false);
    load();
  }

  async function toggle(c: Code) {
    await fetch("/api/admin/promo-codes/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, maxUses: c.maxUses === "" ? "" : c.maxUses, active: !c.active })
    }).catch(() => {});
    load();
  }

  async function remove(code: string) {
    if (typeof window !== "undefined" && !window.confirm(`Obrisati kod ${code}? Postojeće narudžbe ostaju nepromijenjene.`)) return;
    await fetch(`/api/admin/promo-codes/?code=${encodeURIComponent(code)}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  return (
    <div className="space-y-4">
      <div className="a-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">Popust-kodovi</div>
            <div className="mt-0.5 text-[12px] text-[#8e8e93]">
              {loading ? "Učitavam…" : `${codes.length} kodova · mijenjaj bez diranja koda`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setF({ ...empty }); setOpen((v) => !v); setErr(""); }}
            className="a-btn a-btn-primary shrink-0 px-4 py-2 text-sm"
          >
            {open ? "✕ Zatvori" : "➕ Novi kod"}
          </button>
        </div>

        {open && (
          <div className="mt-4 rounded-[12px] bg-black/[0.03] p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <span className={lbl}>Šifra koda</span>
                <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="LJETO20" className={inp} />
              </div>
              <div>
                <span className={lbl}>Vrsta</span>
                <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={inp}>
                  <option value="percent">Postotak popusta</option>
                  <option value="freeship">Besplatna dostava</option>
                </select>
              </div>
              {f.kind === "percent" && (
                <div>
                  <span className={lbl}>Popust (%)</span>
                  <input value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} inputMode="decimal" className={inp} />
                </div>
              )}
              <div>
                <span className={lbl}>Vrijedi od (€ robe)</span>
                <input value={f.minSubtotal} onChange={(e) => setF({ ...f, minSubtotal: e.target.value })} inputMode="decimal" className={inp} />
              </div>
              <div>
                <span className={lbl}>Vrijedi do (prazno = bez roka)</span>
                <input type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} className={inp} />
              </div>
              <div>
                <span className={lbl}>Limit korištenja (prazno = bez)</span>
                <input value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" className={inp} />
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <span className={lbl}>Opis (vidi ga kupac)</span>
                <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="20% popusta na narudžbe od 50 €" className={inp} />
              </div>
              <div>
                <span className={lbl}>Interna bilješka</span>
                <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Instagram kampanja" className={inp} />
              </div>
            </div>
            {err && <p className="mt-2 text-[12px] font-medium text-red-600">{err}</p>}
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={save} disabled={saving || !f.code.trim()} className="a-btn a-btn-primary px-4 py-2 text-sm disabled:opacity-40">
                {saving ? "Spremam…" : "Spremi kod"}
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-[#6e6e73]">
                <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="h-4 w-4 accent-[#1d1d1f]" />
                Aktivan
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Popis kodova sa statistikom */}
      {!loading && codes.length > 0 && (
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.code} className={`a-card p-3 ${c.active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-black/[0.06] px-2 py-0.5 font-mono text-[13px] font-bold text-[#1d1d1f]">{c.code}</span>
                    <span className="text-[13px] text-[#6e6e73]">
                      {c.kind === "freeship" ? "besplatna dostava" : `−${c.value}%`}
                      {c.minSubtotal > 0 ? ` · od ${eur(c.minSubtotal)}` : ""}
                    </span>
                    {!c.active && <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#8e8e93]">ugašen</span>}
                    {c.expiresAt && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">do {c.expiresAt}</span>}
                    {c.maxUses !== "" && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">limit {c.maxUses}</span>}
                  </div>
                  {c.label && <div className="mt-0.5 text-[12px] text-[#8e8e93]">{c.label}</div>}
                  <div className="mt-1 text-[12px]">
                    <span className="font-semibold text-[#1d1d1f]">{c.uses}× iskorišten</span>
                    {c.discountGiven > 0 && <span className="text-[#8e8e93]"> · dano {eur(c.discountGiven)} popusta</span>}
                    {c.note && <span className="text-[#8e8e93]"> · {c.note}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => edit(c)} className="a-input px-2.5 py-1 text-[12px] font-medium text-[#6e6e73] hover:text-[#1d1d1f]">✏️ Uredi</button>
                  <button type="button" onClick={() => toggle(c)} className="a-input px-2.5 py-1 text-[12px] font-medium text-[#6e6e73] hover:text-[#1d1d1f]">
                    {c.active ? "⏸ Ugasi" : "▶️ Upali"}
                  </button>
                  <button type="button" onClick={() => remove(c.code)} className="rounded-[10px] px-2.5 py-1 text-[12px] font-medium text-red-500 hover:bg-red-50">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
