"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { ImageUploader } from "@/components/admin/image-uploader";

type T = { id: string; imageUrl: string; name: string | null; text: string | null; hidden: boolean };

function Row({ t, onChange }: { t: T; onChange: () => void }) {
  const [name, setName] = useState(t.name || "");
  const [text, setText] = useState(t.text || "");
  const [hidden, setHidden] = useState(t.hidden);
  const [saving, setSaving] = useState(false);
  const dirty = name !== (t.name || "") || text !== (t.text || "") || hidden !== t.hidden;

  async function save() {
    setSaving(true);
    await fetch("/api/admin/testimonials/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, imageUrl: t.imageUrl, name, text, hidden })
    }).catch(() => {});
    setSaving(false);
    onChange();
  }
  async function del() {
    if (typeof window !== "undefined" && !window.confirm("Obrisati ovu recenziju?")) return;
    await fetch(`/api/admin/testimonials/?id=${t.id}`, { method: "DELETE" }).catch(() => {});
    onChange();
  }

  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 p-2">
      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
        <Image src={t.imageUrl} alt="" fill sizes="80px" className="object-cover" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ime kupca (opcionalno)" className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:border-slate-400" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Kratki tekst / dojam (opcionalno)" className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:border-slate-400" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setHidden((v) => !v)} className={`rounded-md px-2 py-1 text-[11px] font-medium ${hidden ? "bg-amber-500 text-white" : "border border-slate-200 text-slate-500"}`}>{hidden ? "🙈 Skriveno" : "👁 Vidljivo"}</button>
          <button type="button" onClick={save} disabled={saving || !dirty} className="rounded-md bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-40">{saving ? "…" : "Spremi"}</button>
          <button type="button" onClick={del} className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50">Obriši</button>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsManager() {
  const [list, setList] = useState<T[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch("/api/admin/testimonials/").then((r) => r.json()).catch(() => null);
    if (d?.ok) setList(d.testimonials);
  }
  useEffect(() => { load(); }, []);

  async function addAll() {
    if (!newImages.length || saving) return;
    setSaving(true);
    for (const imageUrl of newImages) {
      await fetch("/api/admin/testimonials/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl }) }).catch(() => {});
    }
    setNewImages([]);
    setSaving(false);
    load();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-1 text-sm font-bold text-slate-900">Zadovoljni kupci (recenzije)</div>
      <p className="mb-3 text-xs text-slate-400">Uploadaj slike koje su ti kupci slali (Instagram/WhatsApp). Prikazuju se na naslovnici kao društveni dokaz. Ime/tekst su opcionalni.</p>

      <ImageUploader value={newImages} onChange={setNewImages} slug="recenzije" />
      {newImages.length > 0 && (
        <button type="button" onClick={addAll} disabled={saving} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
          {saving ? "Spremam…" : `Dodaj ${newImages.length} u recenzije`}
        </button>
      )}

      {list.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {list.map((t) => <Row key={t.id} t={t} onChange={load} />)}
        </div>
      )}
    </div>
  );
}
