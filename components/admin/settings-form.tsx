"use client";

import { useEffect, useState } from "react";

type Settings = {
  shippingPrice: number;
  freeShipThreshold: number;
  costDres: number;
  costKomplet: number;
  senders: { igor: { name: string; address: string; city: string }; ivica: { name: string; address: string; city: string } };
  iban: string;
  businessName: string;
  contactPhone: string;
  contactEmail: string;
};

const inp = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400";
const label = "block text-[11px] font-semibold uppercase tracking-wide text-slate-400";

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <div className="text-sm font-bold text-slate-900">{title}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsForm() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/")
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setS(d.settings); })
      .catch(() => {});
  }, []);

  if (!s) return <div className="text-sm text-slate-400">Učitavam postavke…</div>;

  const setNum = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS((cur) => (cur ? { ...cur, [k]: e.target.value } as unknown as Settings : cur));
  const setStr = (k: "iban" | "businessName" | "contactPhone" | "contactEmail") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS((cur) => (cur ? { ...cur, [k]: e.target.value } : cur));
  const setSender = (who: "igor" | "ivica", f: "name" | "address" | "city") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS((cur) => (cur ? { ...cur, senders: { ...cur.senders, [who]: { ...cur.senders[who], [f]: e.target.value } } } : cur));

  async function save() {
    if (!s || saving) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingPrice: s.shippingPrice,
        freeShipThreshold: s.freeShipThreshold,
        costDres: s.costDres,
        costKomplet: s.costKomplet,
        igorName: s.senders.igor.name, igorAddress: s.senders.igor.address, igorCity: s.senders.igor.city,
        ivicaName: s.senders.ivica.name, ivicaAddress: s.senders.ivica.address, ivicaCity: s.senders.ivica.city,
        iban: s.iban, businessName: s.businessName, contactPhone: s.contactPhone, contactEmail: s.contactEmail
      })
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Card title="Nabavne cijene" hint="Utječu na profit i poravnanje. Prodaja: dres 20€, komplet 40€.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={label}>Nabava dresa (€)</span>
            <input value={s.costDres} onChange={setNum("costDres")} inputMode="decimal" className={inp} />
          </div>
          <div>
            <span className={label}>Nabava kompleta (€)</span>
            <input value={s.costKomplet} onChange={setNum("costKomplet")} inputMode="decimal" className={inp} />
          </div>
        </div>
      </Card>

      <Card title="Pošiljatelji (naljepnice)" hint="Ime i adresa koji se ispisuju na naljepnici — Igor ili Ivica.">
        <div className="grid gap-4 sm:grid-cols-2">
          {(["igor", "ivica"] as const).map((who) => (
            <div key={who} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="text-xs font-bold capitalize text-slate-600">{who}</div>
              <div><span className={label}>Ime i prezime</span><input value={s.senders[who].name} onChange={setSender(who, "name")} className={inp} /></div>
              <div><span className={label}>Adresa</span><input value={s.senders[who].address} onChange={setSender(who, "address")} className={inp} /></div>
              <div><span className={label}>Poštanski broj i mjesto</span><input value={s.senders[who].city} onChange={setSender(who, "city")} className={inp} /></div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Podaci o obrtu / kontaktu" hint="Za naljepnice i buduće račune.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><span className={label}>Naziv (obrt/shop)</span><input value={s.businessName} onChange={setStr("businessName")} className={inp} /></div>
          <div><span className={label}>IBAN</span><input value={s.iban} onChange={setStr("iban")} placeholder="HR…" className={inp} /></div>
          <div><span className={label}>Kontakt telefon</span><input value={s.contactPhone} onChange={setStr("contactPhone")} className={inp} /></div>
          <div><span className={label}>Kontakt email</span><input value={s.contactEmail} onChange={setStr("contactEmail")} className={inp} /></div>
        </div>
      </Card>

      <div className="sticky bottom-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Spremam…" : "Spremi postavke"}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-600">✓ Spremljeno</span>}
      </div>
    </div>
  );
}
