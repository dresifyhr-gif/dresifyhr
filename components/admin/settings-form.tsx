"use client";

import { useEffect, useState } from "react";

type Settings = {
  shippingPrice: number;
  freeShipThreshold: number;
  costDres: number;
  costKomplet: number;
  costStreetwear: number;
  costLongSleeve: number;
  deliveryCost: number;
  returnCost: number;
  igorSharePct: number;
  winbackDays: number;
  riskMinFailed: number;
  senders: { igor: { name: string; address: string; city: string }; ivica: { name: string; address: string; city: string } };
  iban: string;
  businessName: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  instagramHandle: string;
  igFollowers: number;
  leagues: string[];
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifyWhatsapp: boolean;
  announcementActive: boolean;
  announcementText: string;
  heroTitle: string;
  heroSubtitle: string;
  hiddenSections: string[];
  accentColor: string;
  koloActive: boolean;
  klubActive: boolean;
  klubTarget: number;
  klubRewardKind: string;
  klubRewardValue: number;
  klubRewardLabel: string;
  monthlyGoal: number;
};

const SECTIONS: [string, string][] = [
  ["trust", "Traka povjerenja"],
  ["streetwear", "Streetwear banner"],
  ["featured", "Najprodavaniji dresovi"],
  ["games", "Poziv na igrice"],
  ["testimonials", "Zadovoljni kupci (slike)"],
  ["reviews", "Recenzije (tekst)"],
  ["instagram", "Instagram feed"],
  ["faq", "Česta pitanja"],
  ["blog", "Blog"],
  ["newsletter", "Newsletter"]
];

const inp = "a-input w-full px-3 py-2 text-sm";
const label = "a-label mb-1 block";

// Kategorije postavki — svaki tab pokazuje samo svoj dio (čišće, brže).
const TABS: [string, string][] = [
  ["novac", "💰 Cijene i novac"],
  ["posiljke", "📦 Pošiljke"],
  ["naslovnica", "📣 Naslovnica"],
  ["akcije", "🎁 Akcije"],
  ["brend", "📸 Brend / IG"],
  ["obavijesti", "🔔 Obavijesti"]
];

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="a-card p-4 sm:p-5">
      <div className="mb-3">
        <div className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--a-text)]">{title}</div>
        {hint && <div className="mt-0.5 text-[12px] text-[var(--a-text-3)]">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsForm() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("novac");

  useEffect(() => {
    fetch("/api/admin/settings/")
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setS(d.settings); })
      .catch(() => {});
  }, []);

  if (!s) return <div className="text-sm text-[var(--a-text-3)]">Učitavam postavke…</div>;

  const setNum = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS((cur) => (cur ? { ...cur, [k]: e.target.value } as unknown as Settings : cur));
  const setStr = (k: "iban" | "businessName" | "contactPhone" | "contactEmail" | "whatsappNumber" | "instagramHandle" | "announcementText" | "heroSubtitle" | "accentColor" | "klubRewardLabel") => (e: React.ChangeEvent<HTMLInputElement>) =>
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
        costStreetwear: s.costStreetwear,
        costLongSleeve: s.costLongSleeve,
        deliveryCost: s.deliveryCost,
        returnCost: s.returnCost,
        igorSharePct: s.igorSharePct,
        winbackDays: s.winbackDays,
        riskMinFailed: s.riskMinFailed,
        igorName: s.senders.igor.name, igorAddress: s.senders.igor.address, igorCity: s.senders.igor.city,
        ivicaName: s.senders.ivica.name, ivicaAddress: s.senders.ivica.address, ivicaCity: s.senders.ivica.city,
        iban: s.iban, businessName: s.businessName, contactPhone: s.contactPhone, contactEmail: s.contactEmail,
        whatsappNumber: s.whatsappNumber, instagramHandle: s.instagramHandle, igFollowers: s.igFollowers, leagues: s.leagues,
        notifyEmail: s.notifyEmail, notifyTelegram: s.notifyTelegram, notifyWhatsapp: s.notifyWhatsapp,
        announcementActive: s.announcementActive, announcementText: s.announcementText,
        heroTitle: s.heroTitle, heroSubtitle: s.heroSubtitle,
        hiddenSections: s.hiddenSections, accentColor: s.accentColor,
        koloActive: s.koloActive,
        klubActive: s.klubActive, klubTarget: s.klubTarget, klubRewardKind: s.klubRewardKind,
        klubRewardValue: s.klubRewardValue, klubRewardLabel: s.klubRewardLabel,
        monthlyGoal: s.monthlyGoal
      })
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <nav className="flex gap-1.5 overflow-x-auto rounded-[14px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-1.5">
        {TABS.map(([key, lab]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition ${tab === key ? "bg-[var(--a-card)] text-[var(--a-text)] shadow-sm" : "text-[var(--a-text-3)] hover:text-[var(--a-text)]"}`}
          >
            {lab}
          </button>
        ))}
      </nav>

      {tab === "novac" && (
      <div className="space-y-4">
      <Card title="Nabavne cijene" hint="Utječu na profit i poravnanje. Prodaja: dres 20€, komplet 40€, streetwear 50€, dugi rukav 35€.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className={label}>Nabava dresa (€)</span>
            <input value={s.costDres} onChange={setNum("costDres")} inputMode="decimal" className={inp} />
          </div>
          <div>
            <span className={label}>Nabava kompleta (€)</span>
            <input value={s.costKomplet} onChange={setNum("costKomplet")} inputMode="decimal" className={inp} />
          </div>
          <div>
            <span className={label}>Nabava streetweara (€)</span>
            <input value={s.costStreetwear} onChange={setNum("costStreetwear")} inputMode="decimal" className={inp} />
          </div>
          <div>
            <span className={label}>Nabava dugog rukava (€)</span>
            <input value={s.costLongSleeve} onChange={setNum("costLongSleeve")} inputMode="decimal" className={inp} />
          </div>
        </div>
      </Card>

      <Card title="Poslovna pravila" hint="Utječu samo na obračun i admin — ne diraju cijene na shopu.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={label}>Trošak besplatne dostave (€)</span>
            <input value={s.deliveryCost} onChange={setNum("deliveryCost")} inputMode="decimal" className={inp} />
            <p className="mt-1 text-[11px] text-[var(--a-text-3)]">Koliko NAS košta kad je dostava besplatna — skida se s marže.</p>
          </div>
          <div>
            <span className={label}>Trošak vraćene pošiljke (€)</span>
            <input value={s.returnCost} onChange={setNum("returnCost")} inputMode="decimal" className={inp} />
            <p className="mt-1 text-[11px] text-[var(--a-text-3)]">Sad 0 jer ne plaćamo povrat. Stavi iznos ako se to promijeni.</p>
          </div>
          <div>
            <span className={label}>Igorov udio u marži (%)</span>
            <input value={s.igorSharePct} onChange={setNum("igorSharePct")} inputMode="decimal" className={inp} />
            <p className="mt-1 text-[11px] text-[var(--a-text-3)]">50 = pola-pola. Ivici ide ostatak. Mijenja poravnanje.</p>
          </div>
          <div>
            <span className={label}>Vrati kupca nakon (dana)</span>
            <input value={s.winbackDays} onChange={setNum("winbackDays")} inputMode="numeric" className={inp} />
            <p className="mt-1 text-[11px] text-[var(--a-text-3)]">Koliko dana bez kupnje da kupac uđe u popis za vraćanje.</p>
          </div>
          <div>
            <span className={label}>Rizičan od (broj odbijanja)</span>
            <input value={s.riskMinFailed} onChange={setNum("riskMinFailed")} inputMode="numeric" className={inp} />
            <p className="mt-1 text-[11px] text-[var(--a-text-3)]">1 = već prvo odbijanje. Stavi 2 ako ti je prestrogo.</p>
          </div>
          <div>
            <span className={label}>Mjesečni cilj prometa (€)</span>
            <input value={s.monthlyGoal} onChange={setNum("monthlyGoal")} inputMode="numeric" className={inp} />
            <p className="mt-1 text-[11px] text-[var(--a-text-3)]">Cilj za progress-traku na Pregledu. Npr. 15000.</p>
          </div>
        </div>
      </Card>
      </div>
      )}

      {tab === "posiljke" && (
      <div className="space-y-4">
      <Card title="Pošiljatelji (naljepnice)" hint="Ime i adresa koji se ispisuju na naljepnici — Igor ili Ivica.">
        <div className="grid gap-4 sm:grid-cols-2">
          {(["igor", "ivica"] as const).map((who) => (
            <div key={who} className="space-y-2 rounded-[12px] border border-black/[0.04] bg-[var(--a-surface-2)] p-3">
              <div className="text-[13px] font-semibold capitalize text-[var(--a-text)]">{who}</div>
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
      </div>
      )}

      {tab === "naslovnica" && (
      <div className="space-y-4">
      <Card title="Traka obavijesti" hint="Žuta traka na vrhu shopa. Prazan tekst = zadane poruke koje se izmjenjuju.">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-[14px] text-[var(--a-text)]">
          <input type="checkbox" checked={s.announcementActive} onChange={(e) => setS((cur) => (cur ? { ...cur, announcementActive: e.target.checked } : cur))} className="h-4 w-4 accent-[#1d1d1f]" />
          Prikaži traku
        </label>
        <span className={label}>Tekst</span>
        <input value={s.announcementText} onChange={setStr("announcementText")} placeholder="Vikend akcija — besplatna dostava!" className={inp} />
      </Card>

      <Card title="Naslovna — hero" hint="Prazno = zadani tekst. U naslovu svaki novi red je nova linija; zadnja je u boji.">
        <div className="space-y-3">
          <div>
            <span className={label}>Naslov</span>
            <textarea value={s.heroTitle} onChange={(e) => setS((cur) => (cur ? { ...cur, heroTitle: e.target.value } : cur))} rows={3} placeholder={"SVAKI DRES.\nSVAKI KLUB.\n20€."} className={`${inp} font-mono text-[13px]`} />
          </div>
          <div>
            <span className={label}>Podnaslov</span>
            <input value={s.heroSubtitle} onChange={setStr("heroSubtitle")} className={inp} />
          </div>
        </div>
      </Card>

      <Card title="Sekcije naslovnice" hint="Odznači da sakriješ sekciju sa shopa. Hero i katalog su uvijek prikazani.">
        <div className="grid gap-2 sm:grid-cols-2">
          {SECTIONS.map(([key, lab]) => {
            const visible = !s.hiddenSections.includes(key);
            return (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--a-text)]">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setS((cur) => {
                    if (!cur) return cur;
                    const set = new Set(cur.hiddenSections);
                    if (e.target.checked) set.delete(key); else set.add(key);
                    return { ...cur, hiddenSections: [...set] };
                  })}
                  className="h-4 w-4 accent-[#1d1d1f]"
                />
                {lab}
              </label>
            );
          })}
        </div>
      </Card>
      </div>
      )}

      {tab === "akcije" && (
      <div className="space-y-4">
      <Card title="🎡 Kolo sreće" hint="Stranica /kolo. Jedna vrtnja po broju mobitela, plus nova za svaku narudžbu od 60 €. Dok je isključeno, stranica ne postoji.">
        <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--a-text)]">
          <input type="checkbox" checked={s.koloActive} onChange={(e) => setS((cur) => (cur ? { ...cur, koloActive: e.target.checked } : cur))} className="h-4 w-4 accent-[#1d1d1f]" />
          Kolo je uključeno
        </label>
        <p className="mt-2 text-[11px] text-[var(--a-text-3)]">
          Dobitna šansa ~27 %: 5 % / 10 % / 20 % popusta, besplatna dostava i gratis dres (1 %).
          Šifre vrijede 48 h i vezane su uz broj mobitela.
        </p>
      </Card>

      <Card title="🎁 Dresify Klub" hint="Vjernost po broju mobitela — bez računa i lozinki. Broje se samo PREUZETE narudžbe.">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-[14px] text-[var(--a-text)]">
          <input type="checkbox" checked={s.klubActive} onChange={(e) => setS((cur) => (cur ? { ...cur, klubActive: e.target.checked } : cur))} className="h-4 w-4 accent-[#1d1d1f]" />
          Klub je uključen
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={label}>Nagrada nakon (preuzetih narudžbi)</span>
            <input value={s.klubTarget} onChange={setNum("klubTarget")} inputMode="numeric" className={inp} />
            <p className="mt-1 text-[11px] text-[var(--a-text-3)]">Broje se samo plaćene (preuzete) narudžbe — da se ne može farmati.</p>
          </div>
          <div>
            <span className={label}>Vrsta nagrade</span>
            <select value={s.klubRewardKind} onChange={(e) => setS((cur) => (cur ? { ...cur, klubRewardKind: e.target.value } : cur))} className={inp}>
              <option value="amount">Fiksni popust (€) — npr. gratis dres</option>
              <option value="percent">Postotak popusta</option>
              <option value="freeship">Besplatna dostava</option>
            </select>
          </div>
          {s.klubRewardKind !== "freeship" && (
            <div>
              <span className={label}>{s.klubRewardKind === "percent" ? "Popust (%)" : "Popust (€)"}</span>
              <input value={s.klubRewardValue} onChange={setNum("klubRewardValue")} inputMode="decimal" className={inp} />
              <p className="mt-1 text-[11px] text-[var(--a-text-3)]">20 € = gratis dres (kupac plati samo dostavu).</p>
            </div>
          )}
          <div>
            <span className={label}>Opis nagrade (vidi kupac)</span>
            <input value={s.klubRewardLabel} onChange={setStr("klubRewardLabel")} className={inp} />
          </div>
        </div>
      </Card>
      </div>
      )}

      {tab === "brend" && (
      <div className="space-y-4">
      <Card title="Brend i kontakt" hint="Mijenja linkove na shopu (WhatsApp gumb, Instagram sekcija, kontakt).">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={label}>WhatsApp broj (samo znamenke)</span>
            <input value={s.whatsappNumber} onChange={setStr("whatsappNumber")} placeholder="385976047510" inputMode="tel" className={inp} />
          </div>
          <div>
            <span className={label}>Instagram (bez @)</span>
            <input value={s.instagramHandle} onChange={setStr("instagramHandle")} placeholder="dresify.hr" className={inp} />
          </div>
          <div>
            <span className={label}>IG pratitelji (za PS5 brojač)</span>
            <input value={s.igFollowers || ""} onChange={setNum("igFollowers")} inputMode="numeric" placeholder="2505" className={inp} />
            <p className="mt-1 text-[11px] text-[var(--a-text-3)]">Ručno upiši trenutni broj pratitelja — prikazuje se u PS5 nagradnoj igri. 0/prazno = ne koristi se.</p>
          </div>
        </div>
      </Card>

      <Card title="Lige" hint="Popis koji se nudi kod dodavanja i uređivanja proizvoda. Jedna liga po retku.">
        <textarea
          value={s.leagues.join("\n")}
          onChange={(e) => setS((cur) => (cur ? { ...cur, leagues: e.target.value.split("\n") } : cur))}
          rows={7}
          className={`${inp} font-mono text-[13px]`}
        />
        <p className="mt-1 text-[11px] text-[var(--a-text-3)]">Prazni redovi se zanemaruju. Ako ostaviš prazno, koriste se zadane lige.</p>
      </Card>
      </div>
      )}

      {tab === "obavijesti" && (
      <div className="space-y-4">
      <Card title="Obavijesti o narudžbi" hint="Koje kanale koristimo kad padne nova narudžba.">
        <div className="space-y-2">
          {([
            ["notifyEmail", "Email"],
            ["notifyTelegram", "Telegram"],
            ["notifyWhatsapp", "WhatsApp / Zapier"]
          ] as const).map(([k, lab]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--a-text)]">
              <input
                type="checkbox"
                checked={s[k]}
                onChange={(e) => setS((cur) => (cur ? { ...cur, [k]: e.target.checked } : cur))}
                className="h-4 w-4 accent-[#1d1d1f]"
              />
              {lab}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[var(--a-text-3)]">Kanal radi samo ako je i postavljen na serveru. Ovdje ga možeš privremeno ugasiti.</p>
      </Card>
      </div>
      )}

      <div className="sticky bottom-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="a-btn a-btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
          {saving ? "Spremam…" : "Spremi postavke"}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-600">✓ Spremljeno</span>}
      </div>
    </div>
  );
}
