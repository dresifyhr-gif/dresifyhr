"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState } from "react";

// Biblioteka reklama: upload videa (direktno u Blob), pregled, skidanje i
// objava kao Instagram reel. Bez baze — popis = sadržaj Bloba pod "reklame/".
type Item = { url: string; name: string; size: number; uploadedAt: string };

const DEFAULT_CAPTION =
  "⚽ Tvoj igrač. Tvoje ime. Tvoj broj.\n\n👕 Dresovi s imenom i brojem — 20 €\n💵 Plaćaš pouzećem kad stigne\n🚚 Dostava 2–5 dana po cijeloj Hrvatskoj\n\n👉 dresifyshop.com\n\n#dresovi #nogomet #dresify #hrvatska";

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
const isVideo = (u: string) => /\.(mp4|mov)($|\?)/i.test(u);
const prettyName = (n: string) => n.replace(/-[A-Za-z0-9]{20,}(?=\.\w+$)/, "");

export function ReklameManager() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/reklame", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (r?.ok) setItems(r.items);
    else setError(r?.message || "Ne mogu učitati reklame.");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError("");
    setProgress(0);
    try {
      const safe = f.name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
      await upload(`reklame/${safe}`, f, {
        access: "public",
        handleUploadUrl: "/api/admin/reklame/upload",
        onUploadProgress: (e) => setProgress(Math.round(e.percentage))
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload nije uspio.");
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(url: string) {
    if (!confirm("Obrisati ovu reklamu iz biblioteke? (Ne briše objavu s Instagrama.)")) return;
    const r = await fetch(`/api/admin/reklame?url=${encodeURIComponent(url)}`, { method: "DELETE" }).then((x) => x.json()).catch(() => null);
    if (r?.ok) setItems((xs) => (xs || []).filter((x) => x.url !== url));
    else setError(r?.message || "Brisanje nije uspjelo.");
  }

  return (
    <div className="space-y-4">
      <div className="a-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="text-[15px] font-semibold text-[var(--a-text)]">🎬 Biblioteka reklama</div>
          <div className="text-[13px] text-[var(--a-text-3)]">Gotovi videi na jednom mjestu — skini na mobitel ili objavi direktno na Instagram.</div>
        </div>
        <label className="cursor-pointer rounded-[10px] bg-[var(--a-text)] px-4 py-2 text-sm font-semibold text-[var(--a-card)]">
          {progress !== null ? `Šaljem… ${progress}%` : "＋ Dodaj video"}
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            className="hidden"
            disabled={progress !== null}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {error && <div className="rounded-[10px] bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      {items === null ? (
        <div className="text-sm text-[var(--a-text-3)]">Učitavam…</div>
      ) : items.length === 0 ? (
        <div className="a-card p-6 text-sm text-[var(--a-text-3)]">Još nema reklama. Dodaj prvi video gumbom gore.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <ReklamaCard key={it.url} item={it} onRemove={() => remove(it.url)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReklamaCard({ item, onRemove }: { item: Item; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState(DEFAULT_CAPTION);
  const [state, setState] = useState<"idle" | "sending" | "processing" | "stuck" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");

  // Container u obradi pamtimo u localStorage (po videu) — ako se stranica zatvori
  // ili obrada traje dulje, objava se nastavlja na ISTI container (nema duplikata).
  const pendingKey = `reklama-pending:${item.url}`;
  const alive = useRef(true);
  const polling = useRef(false);

  const readPending = useCallback(() => {
    try {
      return localStorage.getItem(pendingKey) || "";
    } catch {
      return "";
    }
  }, [pendingKey]);
  const setPending = useCallback(
    (id: string) => {
      try {
        if (id) localStorage.setItem(pendingKey, id);
        else localStorage.removeItem(pendingKey);
      } catch {
        /* privatni način — samo bez pamćenja */
      }
    },
    [pendingKey]
  );

  const poll = useCallback(
    async (containerId: string) => {
      if (polling.current) return;
      polling.current = true;
      setState("processing");
      setMsg("");
      try {
        // Instagram obrađuje video — provjeravaj do ~5 min, pa ponudi "Provjeri ponovno".
        for (let i = 0; i < 60 && alive.current; i++) {
          await new Promise((res) => setTimeout(res, 5000));
          if (!alive.current) return;
          const s = await fetch(`/api/admin/reklame/publish?id=${containerId}`, { cache: "no-store" })
            .then((x) => x.json())
            .catch(() => null);
          if (!s) continue;
          if (!s.ok) {
            setPending("");
            setState("error");
            setMsg(s.message || "Instagram je odbio video.");
            return;
          }
          if (s.status === "published") {
            setPending("");
            setState("done");
            setLink(s.permalink || "");
            return;
          }
        }
        if (alive.current) setState("stuck");
      } finally {
        polling.current = false;
      }
    },
    [setPending]
  );

  useEffect(() => {
    alive.current = true;
    const pending = readPending();
    if (pending) {
      setOpen(true);
      poll(pending);
    }
    return () => {
      alive.current = false;
    };
  }, [poll, readPending]);

  async function publish() {
    const pending = readPending();
    if (pending) return poll(pending); // već poslano — samo nastavi
    if (!confirm("Objaviti ovaj video kao reel na @dresify.hr? Bit će javno vidljiv.")) return;
    setState("sending");
    setMsg("");
    const r = await fetch("/api/admin/reklame/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: item.url, caption })
    })
      .then((x) => x.json())
      .catch(() => null);
    if (!r?.ok) {
      setState("error");
      setMsg(r?.message || "Slanje nije uspjelo.");
      return;
    }
    setPending(String(r.containerId));
    await poll(String(r.containerId));
  }

  const busy = state === "sending" || state === "processing";

  return (
    <div className="a-card overflow-hidden">
      {isVideo(item.url) ? (
        <video src={item.url} controls playsInline preload="metadata" className="aspect-[9/16] max-h-[460px] w-full bg-black object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt={item.name} className="aspect-[9/16] max-h-[460px] w-full bg-black object-contain" />
      )}
      <div className="space-y-3 p-4">
        <div>
          <div className="truncate text-[14px] font-semibold text-[var(--a-text)]">{prettyName(item.name)}</div>
          <div className="text-[12px] text-[var(--a-text-3)]">
            {new Date(item.uploadedAt).toLocaleDateString("hr-HR")} · {mb(item.size)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${item.url}?download=1`} className="rounded-[10px] bg-[var(--a-surface-2)] px-3 py-1.5 text-[13px] font-semibold text-[var(--a-text)]">
            ⬇ Skini
          </a>
          {isVideo(item.url) && (
            <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-[10px] bg-[var(--a-surface-2)] px-3 py-1.5 text-[13px] font-semibold text-[var(--a-text)]">
              📷 Objavi na Instagram
            </button>
          )}
          <button type="button" onClick={onRemove} className="ml-auto rounded-[10px] px-2.5 py-1.5 text-[13px] text-red-500 hover:bg-red-50">
            🗑
          </button>
        </div>

        {open && (
          <div className="space-y-2 border-t border-[var(--a-line)] pt-3">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={8}
              disabled={busy || state === "done" || state === "stuck"}
              className="w-full rounded-[10px] border border-[var(--a-line)] bg-[var(--a-card)] p-2.5 text-[13px] text-[var(--a-text)]"
            />
            {state === "done" ? (
              <div className="rounded-[10px] bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">
                ✅ Objavljeno!{" "}
                {link && (
                  <a href={link} target="_blank" rel="noreferrer" className="underline">
                    Otvori na Instagramu
                  </a>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={publish}
                disabled={busy || !caption.trim()}
                className="w-full rounded-[10px] bg-[var(--a-text)] px-4 py-2 text-sm font-semibold text-[var(--a-card)] disabled:opacity-50"
              >
                {state === "sending"
                  ? "Šaljem Instagramu…"
                  : state === "processing"
                    ? "Instagram obrađuje video… (do par min)"
                    : state === "stuck"
                      ? "Provjeri ponovno i objavi"
                      : "Objavi reel"}
              </button>
            )}
            {state === "error" && <div className="text-[13px] text-red-600">{msg}</div>}
            {state === "stuck" && (
              <div className="text-[13px] text-amber-600">Instagram još obrađuje video. Klikni gore za par minuta — objava se nastavlja, neće se duplati.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
