"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { formatCroatianPhone, phoneKey } from "@/lib/utils";
import { waLink } from "@/components/admin/ui";

const eur = (n: number) =>
  `${(n ?? 0).toLocaleString("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// Čista stat-pločica za sažetke (ikona u boji + velika brojka + podnaslov).
const TILE_TONES: Record<string, string> = {
  amber: "bg-[var(--a-warn-bg)] text-[var(--a-warn)]",
  sky: "bg-[var(--a-info-bg)] text-[var(--a-info)]",
  emerald: "bg-[var(--a-good-bg)] text-[var(--a-good)]",
  slate: "bg-[var(--a-surface-2)] text-[var(--a-text-2)]"
};
function Tile({ icon, label, value, sub, tone, hero }: { icon: string; label: string; value: string; sub?: ReactNode; tone: keyof typeof TILE_TONES; hero?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-[var(--a-card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${hero ? "border-[var(--a-accent)]/40" : "border-[var(--a-line)]"}`}>
      {hero && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--a-accent) 24%, transparent), transparent 70%)" }}
        />
      )}
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${TILE_TONES[tone]}`}>{icon}</div>
        <div className="text-[10px] font-bold uppercase leading-tight tracking-[0.09em] text-[var(--a-text-3)]">{label}</div>
      </div>
      <div className="mt-2.5 text-[24px] font-extrabold leading-none tracking-[-0.02em] text-[var(--a-text)] tabular-nums">{value}</div>
      {sub ? <div className="mt-2.5 text-[11.5px] leading-snug text-[var(--a-text-2)]">{sub}</div> : null}
    </div>
  );
}

// "12 dresova + 3 kompleta" (izostavi dio koji je 0; ako oba 0 → "0 kom").
const komLabel = (dresovi: number, kompleti: number) => {
  const parts: string[] = [];
  if (dresovi > 0) parts.push(`${dresovi} ${dresovi === 1 ? "dres" : "dresova"}`);
  if (kompleti > 0) parts.push(`${kompleti} ${kompleti === 1 ? "komplet" : "kompleta"}`);
  return parts.length ? parts.join(" + ") : "0 kom";
};

type Order = {
  id: string;
  date: string;
  reference: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  itemCount: number;
  total: number;
  status: string;
  cancelReason: string | null; // zašto je otkazano
  shippedBy: string | null;
  courier: string | null; // "gls" | "hp" — preko kojeg kurira je poslano
  tracking: string;
  pin: string | null; // GLS paketomat PIN (auto-uvoz iz paket.hr)
  deliveryStatus: "prep" | "transit" | "delivered" | null; // GLS status dostave (auto-provjera)
  promoCode: string | null;
  cashCollected: boolean;
  risk?: { failed: number; collected: number; priorOrders: number; min?: number };
  items: { id: string; klub: string; igrac: string; label: string; size: string; quantity: number; unitPrice: number }[];
};

type EditItem = { id: string; klub: string; igrac: string; size: string; unitPrice: string };

function ItemsEditor({ orderId, items, onSaved }: { orderId: string; items: Order["items"]; onSaved: () => void }) {
  const [rows, setRows] = useState<EditItem[]>(items.map((it) => ({ id: it.id, klub: it.klub, igrac: it.igrac, size: it.size, unitPrice: String(it.unitPrice) })));
  const [saving, setSaving] = useState(false);

  // Novi redovi imaju privremeni id ("new:…") koji se NE šalje serveru — server ih tada stvara.
  function addRow() {
    setRows((rs) => [...rs, { id: `new:${Date.now()}:${rs.length}`, klub: "", igrac: "", size: "", unitPrice: "20" }]);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    await fetch(`/api/admin/orders/${orderId}/items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: rows.map((r) => ({
          ...(r.id.startsWith("new:") ? {} : { id: r.id }),
          klub: r.klub,
          igrac: r.igrac,
          size: r.size,
          unitPrice: Number(r.unitPrice.replace(",", ".")) || 0
        }))
      })
    }).catch(() => {});
    setSaving(false);
    onSaved();
  }

  return (
    <div className="a-sub mt-2 space-y-2 p-2.5">
      {rows.map((r, i) => (
        <div key={r.id} className="flex flex-wrap items-center gap-1.5">
          <input value={r.klub} onChange={(e) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, klub: e.target.value } : x)))} placeholder="Klub" className="a-input w-28 px-2 py-1 text-[12px]" />
          <input value={r.igrac} onChange={(e) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, igrac: e.target.value } : x)))} placeholder="Igrač / model" className="a-input min-w-[120px] flex-1 px-2 py-1 text-[12px]" />
          <input value={r.size} onChange={(e) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, size: e.target.value } : x)))} placeholder="Vel." className="a-input w-14 px-2 py-1 text-[12px]" />
          <input value={r.unitPrice} onChange={(e) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, unitPrice: e.target.value } : x)))} inputMode="decimal" className="a-input w-14 px-2 py-1 text-[12px]" />
          <button type="button" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))} className="a-btn-sm a-btn-danger px-2 py-1 text-[11px]">✕</button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addRow} className="a-btn-sm px-3 py-1.5 text-[11px]">
          ➕ Dodaj artikl
        </button>
        <button type="button" onClick={save} disabled={saving} className="a-btn a-btn-primary px-3 py-1.5 text-[11px]">
          {saving ? "Spremam…" : "Spremi artikle"}
        </button>
      </div>
    </div>
  );
}

function ContactEditor({ orderId, initial, onSaved }: { orderId: string; initial: { customerName: string; phone: string; address: string }; onSaved: () => void }) {
  const [name, setName] = useState(initial.customerName);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    await fetch(`/api/admin/orders/${orderId}/contact/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: name, phone, address })
    }).catch(() => {});
    setSaving(false);
    onSaved();
  }

  return (
    <div className="a-sub mt-2 space-y-2 p-2.5">
      <label className="block text-[11px] font-medium text-[var(--a-text-2)]">Ime i prezime
        <input value={name} onChange={(e) => setName(e.target.value)} className="a-input mt-0.5 w-full px-2 py-1 text-[13px]" />
      </label>
      <label className="block text-[11px] font-medium text-[var(--a-text-2)]">Telefon
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="a-input mt-0.5 w-full px-2 py-1 text-[13px]" />
      </label>
      <label className="block text-[11px] font-medium text-[var(--a-text-2)]">Adresa (ulica, poštanski broj, mjesto)
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="a-input mt-0.5 w-full px-2 py-1 text-[13px]" />
      </label>
      <button type="button" onClick={save} disabled={saving} className="a-btn a-btn-primary px-3 py-1.5 text-[11px]">
        {saving ? "Spremam…" : "Spremi podatke"}
      </button>
    </div>
  );
}

type NewItem = { klub: string; igrac: string; size: string; unitPrice: string };

function NewOrderForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<NewItem[]>([{ klub: "", igrac: "", size: "", unitPrice: "20" }]);
  const [shipping, setShipping] = useState("7");
  const [shippedBy, setShippedBy] = useState<"" | "igor" | "ivica">("");
  const [status, setStatus] = useState<"new" | "shipped">("new");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const subtotal = rows.reduce((s, r) => s + (Number(r.unitPrice.replace(",", ".")) || 0), 0);
  const total = subtotal + (Number(shipping.replace(",", ".")) || 0);

  function setRow(i: number, patch: Partial<NewItem>) { setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r))); }

  async function save() {
    if (saving) return;
    if (!name.trim()) { setErr("Upiši ime kupca"); return; }
    if (!rows.some((r) => r.klub.trim() || r.igrac.trim() || Number(r.unitPrice) > 0)) { setErr("Dodaj barem jedan artikl"); return; }
    setErr(""); setSaving(true);
    const res = await fetch("/api/admin/orders/create/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: name, phone, address, email, note, shipping, status, shippedBy: shippedBy || null, items: rows.map((r) => ({ klub: r.klub, igrac: r.igrac, size: r.size, unitPrice: r.unitPrice })) })
    }).catch(() => null);
    setSaving(false);
    if (res && res.ok) {
      setName(""); setPhone(""); setAddress(""); setEmail(""); setNote(""); setRows([{ klub: "", igrac: "", size: "", unitPrice: "20" }]); setShipping("7"); setShippedBy(""); setStatus("new");
      onCreated();
    } else {
      const d = res ? await res.json().catch(() => ({})) : {};
      setErr(d?.message || "Greška pri spremanju");
    }
  }

  const inp = "rounded border border-[var(--a-line)] bg-[var(--a-card)] px-2 py-1.5 text-[13px] outline-none focus:border-slate-400";

  return (
    <div className="mb-4 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-card)] p-3">
      <div className="mb-2 text-sm font-semibold text-[var(--a-text)]">➕ Nova narudžba (ručno — Instagram)</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ime i prezime *" className={`col-span-2 ${inp}`} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon (09…)" inputMode="tel" className={`col-span-2 ${inp}`} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresa (ulica, pošt. br., mjesto)" className={`col-span-2 ${inp}`} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (nije obavezno)" inputMode="email" className={`col-span-2 ${inp}`} />
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--a-text-3)]">Artikli</div>
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <input value={r.klub} onChange={(e) => setRow(i, { klub: e.target.value })} placeholder="Klub" className={`w-28 ${inp}`} />
            <input value={r.igrac} onChange={(e) => setRow(i, { igrac: e.target.value })} placeholder="Igrač / model" className={`min-w-[120px] flex-1 ${inp}`} />
            <input value={r.size} onChange={(e) => setRow(i, { size: e.target.value })} placeholder="Vel." className={`w-16 ${inp}`} />
            <input value={r.unitPrice} onChange={(e) => setRow(i, { unitPrice: e.target.value.replace(/[^0-9.,]/g, "") })} inputMode="decimal" placeholder="€" className={`w-16 ${inp}`} />
            <button type="button" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))} disabled={rows.length === 1} className="a-btn-sm a-btn-danger px-2 py-1 text-[11px]">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, { klub: "", igrac: "", size: "", unitPrice: "20" }])} className="a-btn-sm px-2 py-1 text-[11px]">+ Dodaj artikl</button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
        <label className="flex items-center gap-1 text-[var(--a-text-2)]">Dostava <input value={shipping} onChange={(e) => setShipping(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" className={`w-14 ${inp}`} /> €</label>
        <label className="flex items-center gap-1 text-[var(--a-text-2)]">Šalje
          <select value={shippedBy} onChange={(e) => setShippedBy(e.target.value as "" | "igor" | "ivica")} className={inp}>
            <option value="">—</option><option value="igor">Igor</option><option value="ivica">Ivica</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-[var(--a-text-2)]">Status
          <select value={status} onChange={(e) => setStatus(e.target.value as "new" | "shipped")} className={inp}>
            <option value="new">Nova</option><option value="shipped">Poslano</option>
          </select>
        </label>
        <span className="ml-auto text-[var(--a-text-2)]">Roba: <b className="text-[var(--a-text)]">{subtotal.toFixed(0)} €</b> · Ukupno (s dostavom): <b className="text-[var(--a-text)]">{total.toFixed(0)} €</b></span>
      </div>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Napomena (nije obavezno)" className={`mt-2 w-full ${inp}`} />

      {err ? <div className="mt-2 text-[12px] font-medium text-red-500">{err}</div> : null}
      <button type="button" onClick={save} disabled={saving} className="a-btn a-btn-primary mt-2 px-4 py-1.5 text-[12px]">
        {saving ? "Spremam…" : "Spremi narudžbu"}
      </button>
    </div>
  );
}

// GLS pošiljke pratimo na GLS-u, HP na Hrvatskoj pošti — link ide na pravog kurira.
const TRACK_URL = { gls: "https://online.gls-croatia.com/index.php", hp: "https://posiljka.posta.hr/en" };

// Telefon za GLS formu: domaći spojeni oblik (0918765432), bez +385/385 i bez
// razmaka. Puno brojeva je spremljeno bez vodeće nule ("918765432") ili s
// pozivnim brojem — sve svodimo na 09x…. Strani broj (npr. +380) ostaje kakav je.
function localPhone(phone: string | null | undefined): string {
  const raw = (phone || "").trim();
  const d = raw.replace(/\D/g, "");
  if (!d) return raw;
  // Strani broj koji NIJE hrvatski (+385) — ne diramo, samo maknemo razmake.
  if (raw.startsWith("+") && !d.startsWith("385")) return raw.replace(/\s+/g, "");
  if (d.startsWith("00385")) return "0" + d.slice(5);
  if (d.startsWith("385")) return "0" + d.slice(3);
  if (!d.startsWith("0")) return "0" + d; // fali vodeća nula (918765432 → 0918765432)
  return d;
}

// Ime/prezime za GLS formu: zadnja riječ = prezime, ostalo = ime.
function splitName(full: string): { ime: string; prezime: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { ime: full.trim(), prezime: "" };
  return { ime: parts.slice(0, -1).join(" "), prezime: parts[parts.length - 1] };
}

// Adresa je jedno polje ("Ulica 12, 21000, Split"), a GLS forma traži ulicu,
// kućni broj, poštanski i grad odvojeno. Raščlanjujemo po zarezu: 5-znamenkasti
// broj (uz moguću točku) je poštanski, iza njega je grad, prije njega ulica —
// iz koje pokušamo izdvojiti kućni broj na kraju. Kad ne prepozna, sve ide u ulicu.
function parseAddressForGls(address: string): { ulica: string; broj: string; grad: string; postanski: string } {
  const empty = { ulica: (address || "").trim(), broj: "", grad: "", postanski: "" };
  const raw = (address || "").trim();
  if (!raw) return empty;

  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const postIdx = parts.findIndex((p) => /^\d{4,5}\.?$/.test(p));
  if (postIdx === -1) return empty;

  const postanski = parts[postIdx].replace(/\D/g, "");
  const grad = parts[postIdx + 1] ? parts.slice(postIdx + 1).join(", ") : "";
  const street = parts.slice(0, postIdx).join(", ").trim();

  // Kućni broj = broj (uz moguće slovo) na kraju ulice: "Ilica 9a" → "Ilica" + "9a".
  const m = street.match(/^(.*?)[\s]+(\d+[a-zA-Z]?)$/);
  if (m) return { ulica: m[1].trim(), broj: m[2], grad, postanski };
  return { ulica: street, broj: "", grad, postanski };
}

// Panel s podacima primatelja složenim točno po GLS (paket.hr) formi. Svako
// polje ima gumb za kopiranje da se ne prepisuje ručno svaki put.
function GlsCopyPanel({ order }: { order: Order }) {
  const { ime, prezime } = splitName(order.customerName);
  const { ulica, broj, grad, postanski } = parseAddressForGls(order.address);
  const fields: { label: string; value: string }[] = [
    { label: "Ime", value: ime },
    { label: "Prezime", value: prezime },
    { label: "Email", value: order.email },
    { label: "Broj telefona", value: localPhone(order.phone) },
    { label: "Ulica", value: ulica },
    { label: "Kućni broj", value: broj },
    { label: "Grad", value: grad },
    { label: "Poštanski broj", value: postanski }
  ];
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, val: string) {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
    } catch { /* bez međuspremnika — vidljivo je za ručno prepisivanje */ }
  }

  return (
    <div className="mt-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--a-text-3)]">Za GLS formu (klikni za kopiranje)</span>
        <button
          type="button"
          onClick={() => copy("all", fields.filter((f) => f.value).map((f) => `${f.label}: ${f.value}`).join("\n"))}
          className="rounded-[8px] bg-[var(--a-text)] px-2 py-0.5 text-[10px] font-semibold text-[var(--a-card)] hover:opacity-90"
        >
          {copied === "all" ? "✓ kopirano" : "Kopiraj sve"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {fields.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => copy(f.label, f.value)}
            disabled={!f.value}
            title={f.value ? "Klikni za kopiranje" : "Nema podatka — raščlani ručno"}
            className="flex items-center justify-between gap-2 rounded-[8px] border border-[var(--a-line)] bg-[var(--a-card)] px-2 py-1 text-left text-[12px] transition hover:border-slate-400 disabled:cursor-default disabled:opacity-50"
          >
            <span className="min-w-0">
              <span className="block text-[9px] uppercase tracking-wide text-[var(--a-text-3)]">{f.label}</span>
              <span className="block truncate text-[var(--a-text)]">{f.value || "—"}</span>
            </span>
            {f.value && (
              <span className={`shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold ${copied === f.label ? "bg-emerald-100 text-emerald-700" : "bg-[var(--a-text)] text-[var(--a-card)]"}`}>
                {copied === f.label ? "✓ ok" : "Kopiraj"}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--a-text-3)]">Država je uvijek Hrvatska. Provjeri ulicu/broj ako adresa nije standardna.</p>
    </div>
  );
}

function TrackingRow({ id, initial, courier }: { id: string; initial: string; courier: string | null }) {
  const isHp = courier === "hp";
  const trackUrl = isHp ? TRACK_URL.hp : TRACK_URL.gls;
  const trackLabel = isHp ? "Prati na Pošti" : "Prati na GLS-u";
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/orders/${id}/tracking/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking: val })
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Tracking / broj pošiljke"
        className="w-full min-w-0 flex-1 basis-[140px] rounded-[10px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-2.5 py-1 text-[12px] text-[var(--a-text)] outline-none focus:border-slate-400 focus:bg-[var(--a-card)]"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || val === initial}
        className="rounded-[10px] border border-[var(--a-line)] px-2.5 py-1 text-[11px] font-medium text-[var(--a-text-2)] transition hover:bg-[var(--a-surface-2)] disabled:opacity-40"
      >
        {saving ? "…" : saved ? "✓ spremljeno" : "Spremi"}
      </button>
      {val.trim() && (
        <a
          href={trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-[10px] bg-[var(--a-text)] px-2.5 py-1 text-[11px] font-semibold text-[var(--a-card)] transition hover:opacity-90"
          title={isHp ? "Otvori praćenje na Hrvatskoj pošti" : "Otvori praćenje na GLS-u"}
        >
          🔗 {trackLabel}
        </a>
      )}
    </div>
  );
}

// Jedna skupina filter-pilula (Poslao / Naplata / Kurir / Dostava) — isti izgled svugdje.
function FilterGroup({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--a-text-3)]">{label}</span>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${value === o.v ? "bg-[var(--a-text)] text-[var(--a-card)]" : "border border-[var(--a-line)] bg-[var(--a-card)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

const FilterDivider = () => <span className="hidden h-5 w-px shrink-0 bg-[var(--a-line)] sm:block" />;

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "čeka slanje", cls: "bg-[var(--a-warn-bg)] text-[var(--a-warn)]" },
  shipped: { label: "poslano", cls: "bg-[var(--a-good-bg)] text-[var(--a-good)]" },
  done: { label: "gotovo", cls: "bg-[var(--a-good-bg)] text-[var(--a-good)]" },
  returned: { label: "vraćeno", cls: "bg-[var(--a-bad-bg)] text-[var(--a-bad)]" },
  cancelled: { label: "otkazano", cls: "bg-[var(--a-surface-2)] text-[var(--a-text-2)]" }
};

const TABS = [
  { value: "", label: "Sve" },
  { value: "new", label: "Za slanje" },
  { value: "shipped", label: "Poslano" },
  { value: "returned", label: "Vraćeno" },
  { value: "cancelled", label: "Otkazano" }
];

// Gotovi razlozi otkazivanja — jedan klik. "Ostalo" otvara upis.
const CANCEL_REASONS = [
  "Nemam tu veličinu",
  "Nemam taj dres",
  "Predugo čekanje — kupac odustao",
  "Kupac se predomislio",
  "Krivi ili lažni podaci"
];

// Picker koji iskoči kad se klikne "Otkazano" — biraš razlog pa se tek onda otkaže.
function CancelPicker({ onPick, onClose }: { onPick: (reason: string) => void; onClose: () => void }) {
  const [other, setOther] = useState("");
  return (
    <div className="mt-2 rounded-[12px] border border-[var(--a-bad)]/30 bg-[var(--a-bad-bg)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--a-bad)]">Zašto otkazuješ?</span>
        <button type="button" onClick={onClose} className="text-[11px] text-[var(--a-text-3)] hover:text-[var(--a-text)]">✕ odustani</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CANCEL_REASONS.map((r) => (
          <button key={r} type="button" onClick={() => onPick(r)}
            className="rounded-[10px] border border-red-200 bg-[var(--a-card)] px-2.5 py-1 text-[12px] text-[var(--a-text)] transition hover:border-red-400 hover:bg-red-100">
            {r}
          </button>
        ))}
        <button type="button" onClick={() => onPick("")}
          className="rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] px-2.5 py-1 text-[12px] text-[var(--a-text-2)] transition hover:bg-[var(--a-surface-2)]">
          Bez razloga
        </button>
      </div>
      <div className="mt-2 flex gap-1.5">
        <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Ostalo — upiši svoj razlog…"
          onKeyDown={(e) => { if (e.key === "Enter" && other.trim()) onPick(other.trim()); }}
          className="a-input min-w-0 flex-1 px-2.5 py-1 text-[12px]" />
        <button type="button" disabled={!other.trim()} onClick={() => onPick(other.trim())}
          className="a-btn-sm a-btn-danger shrink-0 px-2.5 py-1 text-[11px] disabled:opacity-40">Otkaži</button>
      </div>
    </div>
  );
}

export function OrdersManager() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [shipper, setShipper] = useState(""); // "" | igor | ivica
  const [cashF, setCashF] = useState(""); // "" | collected | pending
  const [courierF, setCourierF] = useState(""); // "" | gls | hp
  const [deliveryF, setDeliveryF] = useState(""); // "" | delivered | transit | prep
  const [filtersOpen, setFiltersOpen] = useState(false); // mobitel: skrij napredne filtere dok ne zatrebaju
  const [sort, setSort] = useState(""); // "" new-first | new | old
  const [editing, setEditing] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [glsOpen, setGlsOpen] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cash, setCash] = useState<{ pendingCount: number; pendingTotal: number; pendingDresovi: number; pendingKompleti: number; collectedTotal: number; collectedDresovi: number; collectedKompleti: number; igorCollected: number; ivicaCollected: number; igorPending: number; ivicaPending: number; igorDresovi: number; igorKompleti: number; ivicaDresovi: number; ivicaKompleti: number } | null>(null);
  const [deliveredPending, setDeliveredPending] = useState<{ total: number; count: number } | null>(null);
  const [total, setTotal] = useState(0);
  const [filteredItems, setFilteredItems] = useState({ dresovi: 0, kompleti: 0 });
  const [cancelReasons, setCancelReasons] = useState<{ reason: string; count: number }[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [glsChecking, setGlsChecking] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const sentinel = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const statusRef = useRef("");
  statusRef.current = status;
  const sortRef = useRef("");
  sortRef.current = sort;
  const shipperRef = useRef("");
  shipperRef.current = shipper;
  const cashRef = useRef("");
  cashRef.current = cashF;
  const courierRef = useRef("");
  courierRef.current = courierF;
  const deliveryRef = useRef("");
  deliveryRef.current = deliveryF;

  const fetchPage = useCallback(async (query: string, p: number, append: boolean) => {
    const my = ++reqId.current;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/orders/search/?q=${encodeURIComponent(query)}&status=${statusRef.current}&shipper=${shipperRef.current}&cash=${cashRef.current}&courier=${courierRef.current}&delivery=${deliveryRef.current}&sort=${sortRef.current}&page=${p}`
      );
      const d = await res.json();
      if (my !== reqId.current) return; // stale response, ignore
      if (d?.ok) {
        setOrders((prev) => (append ? [...prev, ...d.orders] : d.orders));
        setTotal(d.total);
        setFilteredItems({ dresovi: d.filteredDresovi ?? 0, kompleti: d.filteredKompleti ?? 0 });
        setPages(d.pages);
        setPage(p);
        if (d.cash) setCash(d.cash);
        if (d.deliveredPending) setDeliveredPending(d.deliveredPending);
        setCancelReasons(Array.isArray(d.cancelReasons) ? d.cancelReasons : []);
      }
    } catch {
      /* ignore */
    }
    if (my === reqId.current) setLoading(false);
  }, []);

  // Početni pojam iz URL-a (?q=…) — kad ⌘K paleta skoči na kupca.
  useEffect(() => {
    const urlQ = new URLSearchParams(window.location.search).get("q");
    if (urlQ) setQ(urlQ);
  }, []);

  // initial + debounced search (resets list); also refetches when status tab changes
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchPage(q, 1, false), 300);
    return () => clearTimeout(debounce.current);
  }, [q, status, shipper, cashF, courierF, deliveryF, sort, fetchPage]);

  // infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < pages) {
          fetchPage(q, page + 1, true);
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [q, page, pages, loading, fetchPage]);

  async function act(id: string, endpoint: string, body: object) {
    if (busy) return;
    setBusy(id);
    await fetch(`/api/admin/orders/${id}/${endpoint}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).catch(() => {});
    // refresh current list in place (keeps scroll position, updated statuses)
    await fetchPage(q, 1, false);
    setBusy(null);
  }

  // Provjeri GLS dostavu za sve poslane pošiljke i označi dostavljene.
  async function checkDeliveries() {
    if (glsChecking) return;
    setGlsChecking(true);
    const res = await fetch("/api/admin/gls-check/", { method: "POST" }).then((r) => r.json()).catch(() => null);
    setGlsChecking(false);
    if (res?.ok) {
      alert(`GLS provjera gotova (${res.checked} pošiljki).\n✅ Dostavljeno: ${res.delivered} · 🚚 Na dostavi: ${res.transit} · 📦 U pripremi: ${res.prep}\nNovih dostavljeno: ${res.newlyDelivered}`);
      await fetchPage(q, 1, false);
    } else {
      alert("Greška pri provjeri dostave. Pokušaj ponovno.");
    }
  }

  function toggleSel(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulk(action: "ship" | "collect", by?: "igor" | "ivica") {
    if (bulkBusy || selected.size === 0) return;
    const ids = [...selected];
    const label = action === "ship" ? `označiti POSLANO${by ? ` (${by})` : ""}` : "označiti NAPLAĆENO";
    if (!window.confirm(`Za ${ids.length} narudžbi: ${label}?`)) return;
    setBulkBusy(true);
    await fetch("/api/admin/orders/bulk/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, by })
    }).catch(() => {});
    setSelected(new Set());
    await fetchPage(q, 1, false);
    setBulkBusy(false);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setShowNew((v) => !v)} className="a-btn a-btn-primary px-3 py-1.5 text-[12px]">
          {showNew ? "✕ Zatvori" : "➕ Nova narudžba (ručno)"}
        </button>
        <a
          href={`/api/admin/export/orders/xlsx/?q=${encodeURIComponent(q)}&status=${status}&shipper=${shipper}&cash=${cashF}&courier=${courierF}`}
          className="rounded-[10px] border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
          title="Preuzmi trenutačno filtrirane narudžbe kao uređeni Excel (.xlsx) — boje, širi stupci, filteri"
        >
          ⬇️ Izvezi Excel{total > 0 ? ` (${total})` : ""}
        </a>
        <button
          type="button"
          onClick={checkDeliveries}
          disabled={glsChecking}
          title="Provjeri kod kurira (GLS + HP) koje su pošiljke dostavljene i označi ih (može potrajati par sekundi)"
          className="rounded-[10px] border border-sky-300 bg-sky-50 px-3 py-1.5 text-[12px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
        >
          {glsChecking ? "⏳ Provjeravam…" : "🚚 Provjeri dostave"}
        </button>
      </div>
      {showNew && <NewOrderForm onCreated={() => { setShowNew(false); fetchPage(q, 1, false); }} />}
      {cash && (cash.pendingCount > 0 || cash.collectedTotal > 0) && (
        <div className="mb-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Tile
              hero
              icon="🛍️" tone="amber" label="Za prikupiti · poslano" value={eur(cash.pendingTotal)}
              sub={`${cash.pendingCount} narudžbi · ${komLabel(cash.pendingDresovi, cash.pendingKompleti)}`}
            />
            <Tile
              icon="🚚" tone="sky" label="Za sjesti na račun · dostavljeno"
              value={eur(deliveredPending?.total ?? 0)}
              sub={`${deliveredPending?.count ?? 0} dostavljeno · nenaplaćeno`}
            />
            <Tile
              icon="📦" tone="emerald" label="Prikupljeno" value={eur(cash.collectedTotal)}
              sub={komLabel(cash.collectedDresovi, cash.collectedKompleti)}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 px-1 text-xs text-[var(--a-text-2)]">
            <span>💰 Igor prikupio: <b className="text-[var(--a-text)]">{eur(cash.igorCollected)}</b> <span className="text-[var(--a-text-3)]">({komLabel(cash.igorDresovi, cash.igorKompleti)})</span>{cash.igorPending > 0 ? <> · fali {eur(cash.igorPending)}</> : null}</span>
            <span>💰 Ivica prikupila: <b className="text-[var(--a-text)]">{eur(cash.ivicaCollected)}</b> <span className="text-[var(--a-text-3)]">({komLabel(cash.ivicaDresovi, cash.ivicaKompleti)})</span>{cash.ivicaPending > 0 ? <> · fali {eur(cash.ivicaPending)}</> : null}</span>
          </div>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            type="button"
            onClick={() => setStatus(tb.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${status === tb.value ? "bg-[var(--a-text)] text-[var(--a-card)]" : "border border-[var(--a-line)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Sažetak razloga otkazivanja — vidi se samo na filteru "Otkazano". */}
      {status === "cancelled" && cancelReasons.length > 0 && (
        <div className="a-sub mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--a-text-3)]">Razlozi</span>
          {cancelReasons.map((r) => (
            <span key={r.reason} className="text-[12px] text-[var(--a-text)]">
              {r.reason} <b className="text-[var(--a-bad)]">{r.count}×</b>
            </span>
          ))}
        </div>
      )}

      {/* Mobitel: gumb koji otvara/zatvara napredne filtere (na desktopu su uvijek vidljivi). */}
      {(() => {
        const activeCount = [shipper, cashF, courierF, deliveryF].filter(Boolean).length;
        return (
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="mb-2 flex w-full items-center justify-between rounded-[12px] border border-[var(--a-line)] px-3 py-2 text-xs font-semibold text-[var(--a-text-2)] lg:hidden"
          >
            <span className="flex items-center gap-2">
              🔎 Filteri
              {activeCount > 0 && (
                <span className="rounded-full bg-[var(--a-text)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--a-card)]">{activeCount}</span>
              )}
            </span>
            <span className="text-[var(--a-text-3)]">{filtersOpen ? "▲ sakrij" : "▼ prikaži"}</span>
          </button>
        );
      })()}

      {/* Odvojeno po pošiljatelju i po naplati — za organizirano praćenje */}
      <div className={`a-sub mb-3 ${filtersOpen ? "flex" : "hidden"} flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 lg:flex`}>
        <FilterGroup label="Poslao" value={shipper} onChange={setShipper}
          options={[{ v: "", l: "Svi" }, { v: "igor", l: "Igor" }, { v: "ivica", l: "Ivica" }]} />
        <FilterDivider />
        <FilterGroup label="Naplata" value={cashF} onChange={setCashF}
          options={[{ v: "", l: "Sve" }, { v: "collected", l: "💰 Prikupljeno" }, { v: "pending", l: "⏳ Nije prikupljeno" }]} />
        <FilterDivider />
        <FilterGroup label="Kurir" value={courierF} onChange={setCourierF}
          options={[{ v: "", l: "Svi" }, { v: "gls", l: "🚚 GLS" }, { v: "hp", l: "🚚 HP" }]} />
        <FilterDivider />
        <FilterGroup label="Dostava" value={deliveryF} onChange={setDeliveryF}
          options={[{ v: "", l: "Sve" }, { v: "delivered", l: "✅ Dostavljeno" }, { v: "transit", l: "🚚 Na dostavi" }, { v: "prep", l: "📦 U pripremi" }]} />
        {(shipper || cashF || courierF || deliveryF) && (
          <button
            type="button"
            onClick={() => { setShipper(""); setCashF(""); setCourierF(""); setDeliveryF(""); }}
            className="ml-auto text-[11px] font-semibold text-[var(--a-text-3)] underline decoration-dotted hover:text-[var(--a-text)]"
          >
            ↺ Poništi
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Traži po imenu, broju mobitela ili adresi…"
          className="a-input min-w-[180px] flex-1 px-3.5 py-2.5 text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="shrink-0 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] px-3 py-2.5 text-sm text-[var(--a-text)] outline-none focus:border-slate-400"
        >
          <option value="">Zadano (za slanje prvo)</option>
          <option value="new">Najnovije prvo</option>
          <option value="old">Najstarije prvo</option>
        </select>
        <span className="shrink-0 text-xs text-[var(--a-text-3)]">{total} narudžbi · {komLabel(filteredItems.dresovi, filteredItems.kompleti)}</span>
      </div>

      {/* Skupne akcije — pojave se kad je nešto označeno */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--a-line)] bg-[var(--a-text)] px-3 py-2 text-[var(--a-card)] shadow-lg">
          <span className="text-sm font-semibold">{selected.size} označeno</span>
          <span className="text-white/40">·</span>
          <span className="text-xs text-white/70">Označi poslano:</span>
          <button type="button" disabled={bulkBusy} onClick={() => bulk("ship", "igor")} className="rounded-[10px] bg-[var(--a-card)]/10 px-2.5 py-1 text-xs font-semibold hover:bg-[var(--a-card)]/20 disabled:opacity-50">📦 Igor</button>
          <button type="button" disabled={bulkBusy} onClick={() => bulk("ship", "ivica")} className="rounded-[10px] bg-[var(--a-card)]/10 px-2.5 py-1 text-xs font-semibold hover:bg-[var(--a-card)]/20 disabled:opacity-50">📦 Ivica</button>
          <span className="text-white/40">·</span>
          <button type="button" disabled={bulkBusy} onClick={() => bulk("collect")} className="a-btn-sm a-btn-ok px-2.5 py-1 text-xs">💰 Naplaćeno</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto rounded-[10px] px-2 py-1 text-xs text-white/60 hover:text-white">Odznači</button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--a-text-3)]">{loading ? "Učitavam…" : "Nema rezultata."}</div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {orders.map((o) => {
            const st = STATUS[o.status] || { label: o.status, cls: "bg-[var(--a-surface-2)] text-[var(--a-text-2)]" };
            const isBusy = busy === o.id;
            return (
              <div key={o.id} className={`a-row p-3 ${selected.has(o.id) ? "!border-black/20 !bg-[var(--a-surface-2)]" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 max-w-full items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleSel(o.id)}
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#1d1d1f]"
                      title="Označi za skupnu akciju"
                    />
                    <div className="min-w-0 max-w-full">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {phoneKey(o.phone) ? (
                        <a href={`/admin/kupci/${phoneKey(o.phone)}`} className="font-semibold text-[var(--a-text)] underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500" title="Otvori profil kupca">{o.customerName}</a>
                      ) : (
                        <span className="font-semibold text-[var(--a-text)]">{o.customerName}</span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                      {o.status === "cancelled" && o.cancelReason && (
                        <span className="rounded bg-[var(--a-bad-bg)] px-1.5 py-0.5 text-[10px] text-[var(--a-bad)]" title="Razlog otkazivanja">↳ {o.cancelReason}</span>
                      )}
                      {o.promoCode && (
                        <span
                          title="Osvojena nagrada na igrici — besplatna dostava (bez +7 €)"
                          className="rounded bg-[var(--a-warn-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--a-warn)]"
                        >
                          🎁 {o.promoCode} · bespl. dostava
                        </span>
                      )}
                      {o.shippedBy && <span className="text-[10px] text-[var(--a-text-3)]">({o.shippedBy})</span>}
                      {(o.status === "shipped" || o.status === "done") && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => act(o.id, "courier", { courier: o.courier === "hp" ? "gls" : "hp" })}
                          title="Klikni za prebacivanje kurira (GLS ↔ HP)"
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition disabled:opacity-40 ${
                            o.courier === "hp" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          }`}
                        >
                          🚚 {o.courier === "hp" ? "HP" : "GLS"}
                        </button>
                      )}
                      {o.pin && (
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(o.pin || "").catch(() => {})}
                          title="GLS paketomat PIN (auto-uvezen iz paket.hr) — klikni za kopiranje"
                          className="rounded-md bg-lime-300 px-2 py-0.5 text-sm font-black tracking-wider text-black shadow-sm transition hover:bg-lime-400"
                        >
                          🔑 {o.pin}
                        </button>
                      )}
                      {o.deliveryStatus && !o.cashCollected && (
                        <span
                          title="Status dostave (auto-provjera) — samo za nenaplaćene"
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            o.deliveryStatus === "delivered" ? "bg-emerald-100 text-emerald-700"
                              : o.deliveryStatus === "transit" ? "bg-sky-100 text-sky-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {o.deliveryStatus === "delivered" ? "✅ Dostavljeno" : o.deliveryStatus === "transit" ? "🚚 Na dostavi" : "📦 U pripremi"}
                        </span>
                      )}
                      {o.risk && o.risk.failed >= (o.risk.min ?? 1) && o.risk.failed > 0 && (
                        <span
                          title={`Ovaj broj je ranije ${o.risk.failed}× vratio pošiljku (odbio pouzeće)${o.risk.collected > 0 ? `, a ${o.risk.collected}× uredno preuzeo` : ""}. Provjeri prije slanja.`}
                          className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700"
                        >
                          ⚠️ Rizičan · {o.risk.failed}× odbio{o.risk.collected > 0 ? ` · ${o.risk.collected}× ok` : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--a-text-2)]">
                      {o.date} · {formatCroatianPhone(o.phone)}
                      {o.address ? (
                        <>
                          {" · "}{o.address}{" "}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whitespace-nowrap font-medium text-emerald-600 hover:underline"
                          >
                            📍 Karta
                          </a>
                        </>
                      ) : null}
                    </div>
                    {o.email ? (
                      <div className="mt-0.5 break-all text-xs text-[var(--a-text-2)]">
                        ✉️ <a href={`mailto:${o.email}`} className="font-medium text-[var(--a-text-2)] hover:text-[var(--a-text)] hover:underline">{o.email}</a>
                      </div>
                    ) : null}
                    <div className="mt-0.5 text-xs text-[var(--a-text-3)]">#{o.reference} · {o.itemCount} kom · <span className="font-semibold text-[var(--a-text)]">{eur(o.total)}</span></div>
                    {o.items.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {o.items.map((it, idx) => (
                          <li key={idx} className="text-[13px] text-[var(--a-text)]">
                            📦 {it.quantity > 1 ? `${it.quantity}× ` : ""}<span className="font-medium">{it.label}</span>
                            {it.size ? <span className="text-[var(--a-text-2)]"> · veličina {it.size}</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    </div>
                  </div>
                  <span className="flex flex-wrap items-center justify-end gap-1.5">
                    {waLink(o.phone) && (
                      <a
                        href={waLink(o.phone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="a-btn-sm a-btn-ok px-2 py-1 text-[11px]"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                    {/* Igor/Ivica PDF naljepnice (za HP) maknute — sve ide preko GLS-a */}
                    <a
                      href={`/admin/print/${o.id}/gls/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="GLS naljepnica: ime kupca + logo + QR na Instagram (adresu radi GLS)"
                      className="a-btn-sm px-2 py-1 text-[11px]"
                    >
                      🚚 GLS
                    </a>
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "ship", { shipped: true, by: "igor" })}
                    className="a-btn-sm a-btn-ok px-2 py-1 text-[11px]">✓ Igor poslao</button>
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "ship", { shipped: true, by: "ivica" })}
                    className="a-btn-sm px-2 py-1 text-[11px]">✓ Ivica poslao</button>
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "return", { returned: true })}
                    className="a-btn-sm a-btn-danger px-2 py-1 text-[11px]">↩ Vraćeno</button>
                  <button type="button" disabled={isBusy} onClick={() => setCancelling((c) => (c === o.id ? null : o.id))}
                    className="a-btn-sm px-2 py-1 text-[11px]">✕ Otkazano</button>
                  <button type="button" disabled={isBusy} onClick={() => act(o.id, "ship", { shipped: false })}
                    className="a-btn-sm px-2 py-1 text-[11px]">↺ Vrati u nove</button>
                  {(o.status === "shipped" || o.status === "done") && (
                    <button type="button" disabled={isBusy} onClick={() => act(o.id, "collect", { collected: !o.cashCollected })}
                      title={o.cashCollected ? "Novci prikupljeni — klikni da poništiš" : "Označi da su novci (pouzeće) prikupljeni"}
                      className={`rounded-[10px] px-2 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${o.cashCollected ? "bg-[var(--a-good)] text-[var(--a-card)] hover:opacity-90" : "border border-[var(--a-warn)]/40 bg-[var(--a-warn-bg)] text-[var(--a-warn)] hover:opacity-90"}`}>
                      {o.cashCollected ? "💰 Prikupljeno ✓" : "💰 Prikupljeno?"}
                    </button>
                  )}
                  <button type="button" onClick={() => setEditing((e) => (e === o.id ? null : o.id))}
                    className="a-btn-sm px-2 py-1 text-[11px]">✏️ Uredi artikle</button>
                  <button type="button" onClick={() => setEditingContact((e) => (e === o.id ? null : o.id))}
                    className="a-btn-sm px-2 py-1 text-[11px]">✏️ Uredi adresu</button>
                  {o.address && (
                    <button type="button" onClick={() => setGlsOpen((e) => (e === o.id ? null : o.id))}
                      title="Podaci primatelja složeni za GLS formu — kopiraj bez prepisivanja"
                      className="a-btn-sm px-2 py-1 text-[11px]">📋 {glsOpen === o.id ? "Sakrij formu" : "Forma"}</button>
                  )}
                </div>

                {glsOpen === o.id && <GlsCopyPanel order={o} />}

                {cancelling === o.id && (
                  <CancelPicker
                    onClose={() => setCancelling(null)}
                    onPick={(reason) => { setCancelling(null); act(o.id, "cancel", { cancelled: true, reason }); }}
                  />
                )}

                {editing === o.id && (
                  <ItemsEditor orderId={o.id} items={o.items} onSaved={() => { setEditing(null); fetchPage(q, 1, false); }} />
                )}

                {editingContact === o.id && (
                  <ContactEditor orderId={o.id} initial={{ customerName: o.customerName, phone: o.phone, address: o.address }} onSaved={() => { setEditingContact(null); fetchPage(q, 1, false); }} />
                )}

                <TrackingRow id={o.id} initial={o.tracking} courier={o.courier} />
              </div>
            );
          })}
        </div>
      )}

      {/* infinite-scroll sentinel */}
      <div ref={sentinel} className="h-8" />
      {loading && orders.length > 0 && <div className="py-3 text-center text-xs text-[var(--a-text-3)]">Učitavam još…</div>}
      {page >= pages && orders.length > 0 && <div className="py-3 text-center text-xs text-[#c7c7cc]">— kraj popisa —</div>}
    </div>
  );
}
