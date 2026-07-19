"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export function ImageUploader({ value, onChange, slug }: { value: string[]; onChange: (urls: string[]) => void; slug?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setBusy(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      if (slug) fd.append("slug", slug);
      try {
        const res = await fetch("/api/admin/upload/", { method: "POST", body: fd });
        const d = await res.json();
        if (d?.ok && d.url) urls.push(d.url);
        else setError(d?.message || "Greška pri uploadu.");
      } catch {
        setError("Greška pri uploadu.");
      }
    }
    setBusy(false);
    if (urls.length) onChange([...value, ...urls]);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border-2 border-dashed p-5 text-center text-sm transition ${drag ? "border-slate-900 bg-black/[0.03]" : "border-black/[0.06] hover:border-black/[0.12]"}`}
      >
        <span className="text-2xl">🖼️</span>
        <span className="font-medium text-[#6e6e73]">{busy ? "Uploadam…" : "Povuci slike ovdje ili klikni za odabir"}</span>
        <span className="text-[11px] text-[#8e8e93]">JPG / PNG / WebP · max 8 MB · prva slika je glavna</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {value.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-[12px] border border-black/[0.06] bg-black/[0.03]">
              <Image src={url} alt="" fill sizes="120px" className="object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-slate-900/80 px-1 py-0.5 text-[9px] font-semibold text-white">glavna</span>}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1 py-0.5 opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={() => move(i, -1)} className="text-white text-[11px]">◀</button>
                <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="text-white text-[11px]">✕</button>
                <button type="button" onClick={() => move(i, 1)} className="text-white text-[11px]">▶</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
