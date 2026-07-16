"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

const LIGE = ["Reprezentacija", "La Liga", "Premier Liga", "Serie A", "Bundesliga", "Ligue 1", "Saudi Pro", "Brazil", "MLS", "Komplet"];

type Row = {
  key: string;
  fileName: string;
  preview: string;
  status: "waiting" | "uploading" | "reading" | "ready" | "saving" | "saved" | "error";
  error?: string;
  imageUrl?: string;
  category: string;
  klub: string;
  igrac: string;
  liga: string;
  price: string;
  retro: boolean;
  badge: string;
  description: string;
  seen?: string;
  confidence?: string;
  dup?: string | null; // naziv postojećeg proizvoda ako je vjerojatan duplikat
  checked: boolean;
};

// Normalizacija za usporedbu (bez kvačica, mala slova, samo slova/brojke).
const norm = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Jaccard sličnost po riječima — hvata "Yamal bijelo rozi" vs "Yamal nr10 — bijelo/rozi".
function similarity(a: string, b: string) {
  const A = new Set(norm(a).split(" ").filter((w) => w.length > 1));
  const B = new Set(norm(b).split(" ").filter((w) => w.length > 1));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / new Set([...A, ...B]).size;
}

export function BulkAdd({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [existing, setExisting] = useState<{ label: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((key: string, p: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }, []);

  // Postojeći katalog (za provjeru duplikata) — dohvat jednom.
  async function loadExisting() {
    if (existing.length) return existing;
    try {
      const d = await fetch("/api/admin/products/").then((r) => r.json());
      const list = d?.ok ? d.products.map((p: { klub: string; igrac: string }) => ({ label: `${p.klub} ${p.igrac}` })) : [];
      setExisting(list);
      return list;
    } catch {
      return [];
    }
  }

  function findDup(klub: string, igrac: string, list: { label: string }[]) {
    const cand = `${klub} ${igrac}`;
    let best: { label: string; score: number } | null = null;
    for (const e of list) {
      const score = similarity(cand, e.label);
      if (!best || score > best.score) best = { label: e.label, score };
    }
    return best && best.score >= 0.55 ? best.label : null;
  }

  async function addFiles(files: FileList | File[]) {
    const list = await loadExisting();
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;

    const fresh: Row[] = arr.map((f, i) => ({
      key: `${Date.now()}-${i}-${f.name}`,
      fileName: f.name,
      preview: URL.createObjectURL(f),
      status: "waiting",
      category: "dres",
      klub: "",
      igrac: "",
      liga: "Reprezentacija",
      price: "20",
      retro: false,
      badge: "novo",
      description: "",
      checked: true
    }));
    setRows((rs) => [...rs, ...fresh]);
    setBusy(true);

    // Obradi po 3 paralelno (upload + AI čitanje).
    const queue = arr.map((file, i) => ({ file, key: fresh[i].key }));
    const worker = async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        try {
          patch(job.key, { status: "uploading" });
          const fd = new FormData();
          fd.append("file", job.file);
          fd.append("slug", "bulk");
          const up = await fetch("/api/admin/upload/", { method: "POST", body: fd }).then((r) => r.json());
          if (!up?.ok) { patch(job.key, { status: "error", error: up?.message || "Upload nije uspio" }); continue; }

          patch(job.key, { status: "reading", imageUrl: up.url });
          const ai = await fetch("/api/admin/analyze-image/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: up.url })
          }).then((r) => r.json());

          if (!ai?.ok) { patch(job.key, { status: "error", error: ai?.message || "AI nije pročitao sliku" }); continue; }

          patch(job.key, {
            status: "ready",
            category: ai.category || "dres",
            klub: ai.klub || "",
            igrac: ai.igrac || "",
            liga: LIGE.includes(ai.liga) ? ai.liga : "Reprezentacija",
            retro: ai.retro === true,
            badge: ai.badge || "novo",
            description: ai.description || "",
            price: ai.category === "streetwear" ? "50" : "20",
            seen: ai.seen || "",
            confidence: ai.confidence || "",
            dup: findDup(ai.klub || "", ai.igrac || "", list),
            checked: !findDup(ai.klub || "", ai.igrac || "", list) // duplikati odznačeni
          });
        } catch {
          patch(job.key, { status: "error", error: "Greška." });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setBusy(false);
  }

  async function saveAll() {
    if (savingAll) return;
    setSavingAll(true);
    const toSave = rows.filter((r) => r.checked && r.status === "ready" && r.imageUrl && (r.klub.trim() || r.igrac.trim()));
    for (const r of toSave) {
      patch(r.key, { status: "saving" });
      try {
        const res = await fetch("/api/admin/custom-products/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: r.category,
            klub: r.klub,
            igrac: r.igrac,
            liga: r.liga,
            price: Number(r.price.replace(",", ".")) || (r.category === "streetwear" ? 50 : 20),
            retro: r.retro,
            badge: r.badge,
            description: r.description,
            images: [r.imageUrl],
            vel: r.category === "streetwear" ? "Odrasli: S-XXL" : "Djeca: 104-176 · Odrasli: S-XXL"
          })
        }).then((x) => x.json());
        patch(r.key, res?.ok ? { status: "saved" } : { status: "error", error: res?.message || "Spremanje nije uspjelo" });
      } catch {
        patch(r.key, { status: "error", error: "Greška pri spremanju." });
      }
    }
    setSavingAll(false);
    onDone();
  }

  const readyCount = rows.filter((r) => r.status === "ready" && r.checked).length;
  const savedCount = rows.filter((r) => r.status === "saved").length;
  const dupCount = rows.filter((r) => r.dup).length;
  const inp = "rounded border border-slate-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-slate-400";

  return (
    <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-slate-900">📦 Masovno dodavanje</div>
          <div className="text-xs text-slate-500">Ubaci više slika odjednom — AI svaku pročita, ti pregledaš i spremiš sve.</div>
        </div>
        {rows.length > 0 && (
          <button type="button" onClick={() => setRows([])} className="text-[11px] font-semibold text-slate-400 underline decoration-dotted hover:text-slate-700">
            ↺ Očisti listu
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-violet-300 bg-white p-5 text-center text-sm transition hover:border-violet-500"
      >
        <span className="text-2xl">🖼️</span>
        <span className="font-medium text-slate-600">{busy ? "Obrađujem…" : "Povuci više slika ovdje ili klikni za odabir"}</span>
        <span className="text-[11px] text-slate-400">Svaka slika = jedan proizvod · AI čita klub, igrača, broj i boje</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {rows.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span>{rows.length} slika</span>
            {dupCount > 0 && <span className="font-semibold text-amber-600">⚠️ {dupCount} mogućih duplikata (odznačeni)</span>}
            {savedCount > 0 && <span className="font-semibold text-emerald-600">✓ {savedCount} spremljeno</span>}
          </div>

          <ul className="mt-2 space-y-2">
            {rows.map((r) => (
              <li key={r.key} className={`rounded-lg border p-2.5 ${r.status === "saved" ? "border-emerald-200 bg-emerald-50/50" : r.status === "error" ? "border-red-200 bg-red-50/50" : r.dup ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={r.checked}
                    disabled={r.status === "saved"}
                    onChange={(e) => patch(r.key, { checked: e.target.checked })}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                    <Image src={r.imageUrl || r.preview} alt="" fill sizes="56px" className="object-contain p-0.5" unoptimized={!r.imageUrl} />
                  </span>

                  <div className="min-w-0 flex-1">
                    {r.status === "uploading" || r.status === "reading" || r.status === "waiting" ? (
                      <p className="py-3 text-[12px] font-medium text-violet-600">
                        {r.status === "waiting" ? "⏳ Čeka…" : r.status === "uploading" ? "⬆️ Uploadam…" : "🪄 AI čita sliku…"}
                        <span className="ml-1 text-slate-400">{r.fileName}</span>
                      </p>
                    ) : r.status === "error" ? (
                      <p className="py-3 text-[12px] font-medium text-red-600">✗ {r.error} <span className="text-slate-400">({r.fileName})</span></p>
                    ) : r.status === "saved" ? (
                      <p className="py-3 text-[12px] font-semibold text-emerald-700">✓ Spremljeno: {r.klub} — {r.igrac}</p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <select value={r.category} onChange={(e) => patch(r.key, { category: e.target.value, price: e.target.value === "streetwear" ? "50" : "20" })} className={`${inp} w-24`}>
                            <option value="dres">👕 Dres</option>
                            <option value="streetwear">🔥 Street</option>
                          </select>
                          <input value={r.klub} onChange={(e) => patch(r.key, { klub: e.target.value })} placeholder="Klub" className={`${inp} w-32`} />
                          <input value={r.igrac} onChange={(e) => patch(r.key, { igrac: e.target.value })} placeholder="Igrač / model" className={`${inp} min-w-[140px] flex-1`} />
                          <select value={r.liga} onChange={(e) => patch(r.key, { liga: e.target.value })} className={`${inp} w-32`}>
                            {LIGE.map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                          <input value={r.price} onChange={(e) => patch(r.key, { price: e.target.value })} inputMode="decimal" className={`${inp} w-14`} />
                          <span className="text-[11px] text-slate-400">€</span>
                        </div>
                        {r.dup && (
                          <p className="mt-1 text-[11px] font-semibold text-amber-700">⚠️ Vjerojatno već postoji: {r.dup} — odznačeno da se ne duplicira</p>
                        )}
                        {r.seen && !r.dup && (
                          <p className={`mt-1 text-[11px] ${r.confidence === "low" ? "text-amber-600" : "text-slate-400"}`}>
                            {r.confidence === "low" ? "⚠️ " : "👁 "}{r.seen}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={saveAll}
            disabled={savingAll || busy || readyCount === 0}
            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            {savingAll ? "Spremam…" : `✓ Spremi označene (${readyCount})`}
          </button>
        </>
      )}
    </div>
  );
}
