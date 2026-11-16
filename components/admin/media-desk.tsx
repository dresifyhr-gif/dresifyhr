"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { ReklameManager } from "@/components/admin/reklame-manager";

// DRESIFY MEDIA — redakcijski stol. Agenti (jutarnja rutina na Igorovom Macu)
// šalju pregled, ideje i nacrte; ovdje Igor ocjenjuje, uređuje, odobrava i
// objavljuje ili zakazuje. Ništa ne ide na Instagram bez njegova klika.

type Img = { url: string; source: string; credit?: string; license?: string; link?: string };
type Src = { label: string; url?: string };
type Scores = { dijeljenje?: number; komentari?: number; emocija?: number; hr?: number; ukupno?: number };
type Item = {
  id: string;
  extKey: string | null;
  runDate: string;
  kind: "BRIEF" | "IDEA" | "DRAFT";
  status: string;
  series: string | null;
  format: "FEED_IMAGE" | "CAROUSEL" | "STORY_MANUAL" | null;
  title: string;
  summary: string | null;
  caption: string | null;
  verification: string | null;
  scores: Scores | null;
  sources: Src[] | null;
  images: Img[] | null;
  notes: string | null;
  manualSteps: string | null;
  data: { kpi?: Record<string, number>; learned?: string[] } | null;
  ideaKey: string | null;
  suggestedSlot: string | null;
  rating: number | null;
  ratingComment: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  permalink: string | null;
  error: string | null;
  createdAt: string;
};
type Payload = { ok: boolean; today: string; slots: string[]; bestSlot: string | null; canDecide: boolean; items: Item[] };

type TabId = "danas" | "nacrti" | "kalendar" | "arhiva" | "reklame";

const RATINGS = [
  { v: 4, label: "Odlično", cls: "a-btn-ok" },
  { v: 3, label: "Dobro", cls: "bg-[var(--a-info-bg)] text-[var(--a-info)]" },
  { v: 2, label: "Prosječno", cls: "a-btn-warn" },
  { v: 1, label: "Loše", cls: "a-btn-danger" }
];
const RATING_LABEL: Record<number, string> = { 4: "Odlično", 3: "Dobro", 2: "Prosječno", 1: "Loše" };

const STATUS_LABEL: Record<string, string> = {
  NOVO: "čeka ocjenu",
  ZAKAZANO: "zakazano",
  OBJAVLJUJEM: "objavljujem…",
  OBJAVLJENO: "objavljeno",
  ODBIJENO: "odbijeno",
  VRACENO: "vraćeno agentu",
  NEUSPJELO: "nije uspjelo"
};
const FORMAT_LABEL: Record<string, string> = { FEED_IMAGE: "Objava · 1 slika", CAROUSEL: "Carousel", STORY_MANUAL: "Story · objavi ručno" };
const SOURCE_LABEL: Record<string, string> = {
  COMMONS: "Wikimedia Commons",
  AI: "AI ilustracija (ChatGPT)",
  DRESIFY: "Dresify (naš dres)",
  UPLOAD: "Tvoja slika",
  NONE: "Grafika bez fotke"
};

const DAYS = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];
const MONTHS = ["siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja", "srpnja", "kolovoza", "rujna", "listopada", "studenoga", "prosinca"];

function fmtDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return `${DAYS[dt.getUTCDay()]} ${d}. ${MONTHS[m - 1]}`;
}
function fmtWhen(iso: string) {
  const dt = new Date(iso);
  const date = new Intl.DateTimeFormat("hr-HR", { timeZone: "Europe/Zagreb", weekday: "short", day: "numeric", month: "numeric" }).format(dt);
  const time = new Intl.DateTimeFormat("hr-HR", { timeZone: "Europe/Zagreb", hour: "2-digit", minute: "2-digit" }).format(dt);
  return `${date} ${time}`;
}
function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n, 12));
  return dt.toISOString().slice(0, 10);
}
function zagrebDateOf(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
const EMOJI_RE = new RegExp("\\p{Extended_Pictographic}", "gu");
const emojiCount = (s: string) => (s.match(EMOJI_RE) || []).length;

// ————————————————————————————————————————————————————————————————
export function MediaDesk({ initialTab = "danas" }: { initialTab?: TabId }) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/media/", { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null);
    if (r?.ok) {
      setData(r);
      setError("");
    } else setError("Ne mogu učitati Media. Osvježi stranicu.");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const replace = useCallback((it: Item) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === it.id ? it : x)) } : d)), []);

  const items = data?.items || [];
  const latestRun = useMemo(() => items.map((i) => i.runDate).sort().at(-1) || null, [items]);
  const waiting = items.filter((i) => i.kind === "DRAFT" && ["NOVO", "VRACENO", "NEUSPJELO"].includes(i.status));
  const todayCount = latestRun ? items.filter((i) => i.runDate === latestRun && i.kind === "IDEA").length : 0;

  const TABS: { id: TabId; label: string; n?: number }[] = [
    { id: "danas", label: "Danas", n: todayCount || undefined },
    { id: "nacrti", label: "Nacrti", n: waiting.length || undefined },
    { id: "kalendar", label: "Kalendar" },
    { id: "arhiva", label: "Arhiva" },
    { id: "reklame", label: "Reklame" }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[12px] bg-[var(--a-surface-2)] p-1" role="tablist" aria-label="Media">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-[10px] px-3.5 py-1.5 text-sm font-semibold transition ${
                tab === t.id ? "bg-[var(--a-card)] text-[var(--a-text)] shadow-sm" : "text-[var(--a-text-3)] hover:text-[var(--a-text)]"
              }`}
            >
              {t.label}
              {t.n ? <span className="ml-1.5 rounded-md bg-accent px-1.5 text-[11px] text-[#1d1d1f]">{t.n}</span> : null}
            </button>
          ))}
        </div>
        {data && !data.canDecide && <div className="text-[12px] text-[var(--a-text-3)]">Pregled · o objavama odlučuje Igor</div>}
      </div>

      {error && <div className="rounded-[10px] bg-[var(--a-bad-bg)] px-4 py-2 text-sm text-[var(--a-bad)]">{error}</div>}

      {tab === "reklame" ? (
        <ReklameManager />
      ) : !data ? (
        <div className="text-sm text-[var(--a-text-3)]">Učitavam…</div>
      ) : tab === "danas" ? (
        <TodayView data={data} runDate={latestRun} onChange={replace} />
      ) : tab === "nacrti" ? (
        <DraftList data={data} items={waiting} onChange={replace} empty="Nema nacrta koji čekaju. Novi stižu svako jutro oko 6 h." />
      ) : tab === "kalendar" ? (
        <CalendarView data={data} />
      ) : (
        <ArchiveView data={data} onChange={replace} />
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// Danas: jutarnji pregled + 3 ideje + nacrti
// ————————————————————————————————————————————————————————————————
function TodayView({ data, runDate, onChange }: { data: Payload; runDate: string | null; onChange: (i: Item) => void }) {
  if (!runDate)
    return (
      <div className="a-card p-6 text-sm text-[var(--a-text-2)]">
        Još nema jutarnjeg pregleda. Rutina na Macu kreće u 6:00 i šalje teme ovamo, a ti dobiješ obavijest na mobitel.
      </div>
    );
  const day = data.items.filter((i) => i.runDate === runDate);
  const brief = day.find((i) => i.kind === "BRIEF");
  const ideas = day.filter((i) => i.kind === "IDEA").sort((a, b) => (b.scores?.ukupno ?? 0) - (a.scores?.ukupno ?? 0));
  const drafts = day.filter((i) => i.kind === "DRAFT");
  const kpi = brief?.data?.kpi || {};
  const kpiRows: [string, number | undefined][] = [
    ["vijesti pregledano", kpi.pregledano],
    ["provjereno", kpi.provjereno],
    ["teme izabrane", ideas.length || kpi.teme],
    ["gotovih nacrta", drafts.length || kpi.nacrti]
  ];

  return (
    <div className="space-y-5">
      <div className="a-card grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="a-label">Jutarnji pregled · {fmtDay(runDate)}</div>
          <div className="mt-1 text-[17px] font-semibold text-[var(--a-text)]">{brief?.title || "Pregled jutra"}</div>
          {brief?.summary && <p className="mt-1 whitespace-pre-line text-[13.5px] text-[var(--a-text-2)]">{brief.summary}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpiRows.map(([label, n]) => (
              <div key={label} className="rounded-[12px] bg-[var(--a-surface-2)] p-3">
                <div className="text-[22px] font-bold tabular-nums tracking-tight text-[var(--a-text)]">{n ?? "—"}</div>
                <div className="text-[11px] font-semibold text-[var(--a-text-3)]">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="a-label">Što su naučili iz tvojih ocjena</div>
          {brief?.data?.learned?.length ? (
            <ul className="mt-2 space-y-1.5 text-[13px] text-[var(--a-text-2)]">
              {brief.data.learned.slice(0, 6).map((l, i) => (
                <li key={i}>• {l}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-[var(--a-text-3)]">Još nema dovoljno ocjena. Ocijeni nacrte ispod i sutra ujutro agenti uče iz toga.</p>
          )}
        </div>
      </div>

      {ideas.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-3">
          {ideas.map((idea, i) => (
            <IdeaCard key={idea.id} idea={idea} rank={i + 1} hasDraft={drafts.some((d) => d.ideaKey && d.ideaKey === idea.extKey)} />
          ))}
        </div>
      )}

      {drafts.length > 0 && <DraftList data={data} items={drafts} onChange={onChange} />}
    </div>
  );
}

function VerificationPill({ v }: { v: string | null }) {
  if (!v) return null;
  const cls =
    v === "POTVRĐENO"
      ? "bg-[var(--a-good-bg)] text-[var(--a-good)]"
      : v === "DJELOMIČNO"
        ? "bg-[var(--a-info-bg)] text-[var(--a-info)]"
        : v === "MIŠLJENJE"
          ? "bg-[var(--a-surface-2)] text-[var(--a-text-2)]"
          : "bg-[var(--a-warn-bg)] text-[var(--a-warn)]";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{v === "POTVRĐENO" ? "✓ " : ""}{v}</span>;
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "warn" | "good" | "bad" }) {
  const cls = {
    neutral: "bg-[var(--a-surface-2)] text-[var(--a-text-2)]",
    info: "bg-[var(--a-info-bg)] text-[var(--a-info)]",
    warn: "bg-[var(--a-warn-bg)] text-[var(--a-warn)]",
    good: "bg-[var(--a-good-bg)] text-[var(--a-good)]",
    bad: "bg-[var(--a-bad-bg)] text-[var(--a-bad)]"
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>;
}

function Sources({ list }: { list: Src[] | null }) {
  if (!list?.length) return null;
  return (
    <div className="text-[12px] text-[var(--a-text-3)]">
      Izvori:{" "}
      {list.map((s, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-[var(--a-text)]">
              {s.label}
            </a>
          ) : (
            s.label
          )}
        </span>
      ))}
    </div>
  );
}

function IdeaCard({ idea, rank, hasDraft }: { idea: Item; rank: number; hasDraft: boolean }) {
  const s = idea.scores || {};
  const rows: [string, number | undefined][] = [
    ["Dijeljenje", s.dijeljenje],
    ["Komentari", s.komentari],
    ["Emocija", s.emocija],
    ["HR relevantnost", s.hr]
  ];
  return (
    <article className="a-card flex flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-extrabold text-[var(--a-text-3)]">
          #{rank}
          {s.ukupno != null ? ` · ${String(s.ukupno).replace(".", ",")}` : ""}
        </span>
        <VerificationPill v={idea.verification} />
      </div>
      {idea.series && <Pill>{idea.series}</Pill>}
      <h3 className="text-[15px] font-semibold leading-snug text-[var(--a-text)]">{idea.title}</h3>
      {idea.summary && <p className="text-[13px] text-[var(--a-text-2)]">{idea.summary}</p>}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {rows.map(([label, v]) => (
          <div key={label} className="text-[11.5px] text-[var(--a-text-2)]">
            <div className="flex justify-between">
              {label} <b className="tabular-nums text-[var(--a-text)]">{v ?? "—"}</b>
            </div>
            <div className="mt-0.5 h-[5px] overflow-hidden rounded bg-[var(--a-surface-2)]">
              <i className="block h-full rounded bg-[var(--a-text)]" style={{ width: `${Math.max(0, Math.min(10, v ?? 0)) * 10}%` }} />
            </div>
          </div>
        ))}
      </div>
      <Sources list={idea.sources} />
      <div>{hasDraft ? <Pill tone="info">Nacrt spreman ↓</Pill> : <Pill>Samo ideja</Pill>}</div>
    </article>
  );
}

// ————————————————————————————————————————————————————————————————
// Nacrti
// ————————————————————————————————————————————————————————————————
function DraftList({ data, items, onChange, empty }: { data: Payload; items: Item[]; onChange: (i: Item) => void; empty?: string }) {
  if (items.length === 0) return <div className="a-card p-6 text-sm text-[var(--a-text-3)]">{empty || "Nema nacrta."}</div>;
  return (
    <div className="space-y-4">
      {items.map((d, i) => (
        <DraftCard key={d.id} item={d} index={i + 1} total={items.length} data={data} onChange={onChange} />
      ))}
    </div>
  );
}

async function patch(id: string, body: Record<string, unknown>): Promise<{ ok: boolean; item?: Item; message?: string }> {
  return fetch(`/api/admin/media/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json())
    .catch(() => ({ ok: false, message: "Nema veze sa serverom." }));
}

function DraftCard({ item, index, total, data, onChange }: { item: Item; index: number; total: number; data: Payload; onChange: (i: Item) => void }) {
  const can = data.canDecide;
  const imgs = item.images || [];
  const [caption, setCaption] = useState(item.caption || "");
  const [comment, setComment] = useState(item.ratingComment || "");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [panel, setPanel] = useState<"" | "schedule" | "publish" | "return">("");
  const [date, setDate] = useState(data.today);
  const [slot, setSlot] = useState(item.suggestedSlot || data.bestSlot || "19:30");
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    setCaption(item.caption || "");
  }, [item.caption]);

  const locked = item.status === "OBJAVLJENO" || item.status === "OBJAVLJUJEM";
  const manual = item.format === "STORY_MANUAL";
  const dirty = caption !== (item.caption || "");
  const emojis = emojiCount(caption);

  async function act(action: string, extra: Record<string, unknown> = {}, label = action) {
    setBusy(label);
    setMsg(null);
    const r = await patch(item.id, { action, ...extra });
    setBusy("");
    if (r.item) onChange(r.item);
    setMsg({ ok: r.ok, text: r.ok ? doneText(action) : r.message || "Nije uspjelo." });
    if (r.ok) setPanel("");
  }
  function doneText(a: string) {
    return (
      {
        rate: "Ocjena spremljena. Agenti je čitaju sutra ujutro.",
        comment: "Komentar spremljen.",
        edit: "Tekst spremljen.",
        schedule: "Zakazano. Push stiže kad se objavi.",
        unschedule: "Zakazivanje maknuto.",
        publish: "Objavljeno na Instagram.",
        markPublished: "Označeno kao objavljeno.",
        return: "Vraćeno agentu. Nova verzija stiže sutra ujutro.",
        reject: "Odbijeno.",
        restore: "Vraćeno u nacrte.",
        images: "Slike spremljene."
      }[a] || "Spremljeno."
    );
  }

  async function upload(f: File | undefined) {
    if (!f) return;
    setBusy("upload");
    setMsg(null);
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/admin/media/upload/", { method: "POST", body: fd })
      .then((x) => x.json())
      .catch(() => null);
    if (!r?.ok) {
      setBusy("");
      setMsg({ ok: false, text: r?.message || "Upload nije uspio." });
      return;
    }
    const mine: Img = { url: r.url, source: "UPLOAD" };
    const next = item.format === "CAROUSEL" ? [...imgs, mine] : [mine];
    await act("images", { images: next }, "upload");
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ ok: true, text: "Tekst kopiran." });
    } catch {
      setMsg({ ok: false, text: "Kopiranje nije uspjelo, označi tekst ručno." });
    }
  }

  const statusTone = item.status === "OBJAVLJENO" ? "good" : item.status === "NEUSPJELO" || item.status === "ODBIJENO" ? "bad" : item.status === "ZAKAZANO" ? "info" : item.status === "VRACENO" ? "warn" : "neutral";

  return (
    <article className="a-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="a-label">
          Nacrt {index} od {total} · {fmtDay(item.runDate)}
        </span>
        {item.series && <Pill>{item.series}</Pill>}
        {item.format && <Pill tone={manual ? "warn" : "neutral"}>{FORMAT_LABEL[item.format]}</Pill>}
        <Pill tone={statusTone}>
          {STATUS_LABEL[item.status] || item.status}
          {item.status === "ZAKAZANO" && item.scheduledAt ? ` · ${fmtWhen(item.scheduledAt)}` : ""}
        </Pill>
        {item.rating ? <Pill tone="info">Tvoja ocjena: {RATING_LABEL[item.rating]}</Pill> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Slike */}
        <div className="min-w-0 space-y-2">
          {imgs.length === 0 ? (
            <div className="grid aspect-[4/5] place-items-center rounded-[12px] bg-[var(--a-surface-2)] p-4 text-center text-[13px] text-[var(--a-text-3)]">
              Nema slike. Dodaj je gumbom „Učitaj svoju“.
            </div>
          ) : (
            <div className="flex snap-x gap-2 overflow-x-auto pb-1">
              {imgs.map((im, i) => (
                <div key={im.url} className="relative w-full shrink-0 snap-start" style={{ maxWidth: imgs.length > 1 ? "85%" : "100%" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt={`Slika ${i + 1}`} loading="lazy" className="w-full rounded-[12px] bg-[var(--a-surface-2)] object-contain" />
                  {imgs.length > 1 && (
                    <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 text-[11px] font-bold text-white">
                      {i + 1}/{imgs.length}
                    </span>
                  )}
                  {can && !locked && (
                    <button
                      type="button"
                      onClick={() => act("images", { images: imgs.filter((x) => x.url !== im.url) }, "images")}
                      className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 text-[11px] font-bold text-white"
                      aria-label="Makni sliku"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1 text-[11.5px] text-[var(--a-text-3)]">
            {imgs.length === 0 ? (
              <div>Izvor slike: —</div>
            ) : (
              Array.from(new Map(imgs.map((im) => [`${im.source}|${im.credit}|${im.license}`, im])).values()).map((im, i) => (
                <div key={i}>
                  <b className="text-[var(--a-text-2)]">{SOURCE_LABEL[im.source] || im.source}</b>
                  {im.credit ? ` · ${im.credit}` : ""}
                  {im.license ? ` · ${im.license}` : ""}
                  {im.link && (
                    <>
                      {" · "}
                      <a href={im.link} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                        licenca
                      </a>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {imgs.map((im, i) => (
              <a key={im.url} href={im.url} target="_blank" rel="noreferrer" className="a-btn-sm px-2.5 py-1 text-[12px]">
                Otvori sliku {imgs.length > 1 ? i + 1 : ""}
              </a>
            ))}
            {can && !locked && (
              <label className="a-btn-sm cursor-pointer px-2.5 py-1 text-[12px]">
                {busy === "upload" ? "Šaljem…" : item.format === "CAROUSEL" ? "＋ Učitaj svoju" : "Učitaj svoju"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} disabled={Boolean(busy)} />
              </label>
            )}
          </div>
        </div>

        {/* Tekst i odluke */}
        <div className="min-w-0 space-y-3">
          <h3 className="text-[16px] font-semibold leading-snug text-[var(--a-text)]">{item.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--a-text-3)]">
            <VerificationPill v={item.verification} />
          </div>
          <Sources list={item.sources} />

          {item.error && <div className="rounded-[10px] bg-[var(--a-bad-bg)] px-3 py-2 text-[13px] text-[var(--a-bad)]">{item.error}</div>}

          {manual && (
            <div className="rounded-[12px] border border-[var(--a-line)] bg-[var(--a-warn-bg)] p-3 text-[13px] text-[var(--a-text)]">
              <b>Objavi ručno.</b> Instagram ne dopušta naljepnice (anketa, kviz) preko API-ja. Spremi sliku na mobitel, objavi je kao story i dodaj
              naljepnicu.
              {item.manualSteps && <div className="mt-2 whitespace-pre-line text-[var(--a-text-2)]">{item.manualSteps}</div>}
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={`cap-${item.id}`} className="a-label">
                {manual ? "Tekst" : "Caption"}
              </label>
              <span className={`text-[11px] ${emojis > 2 ? "font-bold text-[var(--a-warn)]" : "text-[var(--a-text-3)]"}`}>
                {caption.length}/2200 · emojiji {emojis}
                {emojis > 2 ? " (pravilo: najviše 2)" : ""}
              </span>
            </div>
            <textarea
              id={`cap-${item.id}`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              readOnly={!can || locked}
              rows={Math.min(16, Math.max(6, caption.split("\n").length + 1))}
              className="a-input w-full px-3 py-2 text-[13.5px] leading-relaxed"
            />
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button type="button" className="a-btn-sm px-2.5 py-1 text-[12px]" onClick={() => copy(caption)}>
                Kopiraj tekst
              </button>
              {can && !locked && dirty && (
                <button type="button" className="a-btn-sm px-2.5 py-1 text-[12px]" disabled={Boolean(busy)} onClick={() => act("edit", { caption })}>
                  {busy === "edit" ? "Spremam…" : "Spremi tekst"}
                </button>
              )}
            </div>
          </div>

          {item.notes && (
            <div>
              <button type="button" className="text-[12px] font-semibold text-[var(--a-text-3)] hover:text-[var(--a-text)]" onClick={() => setShowNotes((v) => !v)}>
                {showNotes ? "▾" : "▸"} Napomene provjeravatelja (ne idu u objavu)
              </button>
              {showNotes && <div className="mt-1 whitespace-pre-line rounded-[10px] bg-[var(--a-surface-2)] p-3 text-[12.5px] text-[var(--a-text-2)]">{item.notes}</div>}
            </div>
          )}

          {can && (
            <div>
              <div className="a-label mb-1.5">Tvoja ocjena</div>
              <div className="grid grid-cols-4 gap-1.5">
                {RATINGS.map((r) => (
                  <button
                    key={r.v}
                    type="button"
                    aria-pressed={item.rating === r.v}
                    disabled={Boolean(busy)}
                    onClick={() => act("rate", { rating: r.v, comment }, "rate")}
                    className={`a-btn rounded-[10px] px-1 py-2 text-[13px] ${item.rating === r.v ? r.cls : "border border-[var(--a-line)] bg-[var(--a-card)] text-[var(--a-text)]"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <label htmlFor={`com-${item.id}`} className="a-label mb-1 mt-2.5 block">
                Komentar agentima (čitaju ga sutra ujutro)
              </label>
              <textarea
                id={`com-${item.id}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="npr. odlično, ali kraći caption i odgovor u prvi komentar"
                className="a-input w-full px-3 py-2 text-[13px]"
              />
              {comment !== (item.ratingComment || "") && (
                <button type="button" className="a-btn-sm mt-1 px-2.5 py-1 text-[12px]" disabled={Boolean(busy)} onClick={() => act("comment", { comment })}>
                  Spremi komentar
                </button>
              )}
            </div>
          )}

          {can && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {!manual && !locked && (
                  <>
                    <button type="button" className="a-btn a-btn-primary px-3.5 py-2 text-[13px]" disabled={Boolean(busy)} onClick={() => setPanel(panel === "publish" ? "" : "publish")}>
                      Odobri i objavi sada
                    </button>
                    {item.status === "ZAKAZANO" ? (
                      <button type="button" className="a-btn-sm px-3.5 py-2 text-[13px]" disabled={Boolean(busy)} onClick={() => act("unschedule")}>
                        Makni zakazivanje
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="a-btn rounded-[10px] bg-[var(--a-text)] px-3.5 py-2 text-[13px] text-[var(--a-card)]"
                        disabled={Boolean(busy)}
                        onClick={() => setPanel(panel === "schedule" ? "" : "schedule")}
                      >
                        Odobri i zakaži…
                      </button>
                    )}
                  </>
                )}
                {manual && item.status !== "OBJAVLJENO" && (
                  <button type="button" className="a-btn a-btn-primary px-3.5 py-2 text-[13px]" disabled={Boolean(busy)} onClick={() => act("markPublished")}>
                    Objavio sam ručno
                  </button>
                )}
                {!locked && item.status !== "ODBIJENO" && (
                  <>
                    <button type="button" className="a-btn-sm px-3.5 py-2 text-[13px]" disabled={Boolean(busy)} onClick={() => setPanel(panel === "return" ? "" : "return")}>
                      Vrati agentu
                    </button>
                    <button type="button" className="a-btn-sm a-btn-danger px-3.5 py-2 text-[13px]" disabled={Boolean(busy)} onClick={() => act("reject")}>
                      Odbij
                    </button>
                  </>
                )}
                {(item.status === "ODBIJENO" || item.status === "NEUSPJELO") && (
                  <button type="button" className="a-btn-sm px-3.5 py-2 text-[13px]" disabled={Boolean(busy)} onClick={() => act("restore")}>
                    Vrati u nacrte
                  </button>
                )}
                {item.permalink && (
                  <a href={item.permalink} target="_blank" rel="noreferrer" className="a-btn-sm px-3.5 py-2 text-[13px]">
                    Otvori na Instagramu
                  </a>
                )}
              </div>

              {panel === "publish" && (
                <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-[var(--a-surface-2)] p-3 text-[13px]">
                  <span>
                    Objaviti sada na @dresify.hr{item.format === "CAROUSEL" ? ` (${imgs.length} slika)` : ""}? Ovo se ne može poništiti iz admina.
                  </span>
                  {dirty && <span className="font-semibold text-[var(--a-warn)]">Prvo spremi izmijenjeni tekst.</span>}
                  <button
                    type="button"
                    className="a-btn a-btn-primary px-3 py-1.5"
                    disabled={Boolean(busy) || dirty}
                    onClick={() => act("publish", {}, "publish")}
                  >
                    {busy === "publish" ? "Objavljujem…" : "Da, objavi"}
                  </button>
                  <button type="button" className="a-btn-sm px-3 py-1.5" onClick={() => setPanel("")}>
                    Odustani
                  </button>
                </div>
              )}

              {panel === "schedule" && (
                <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-[var(--a-surface-2)] p-3 text-[13px]">
                  <label htmlFor={`d-${item.id}`} className="a-label">
                    Datum
                  </label>
                  <input
                    id={`d-${item.id}`}
                    type="date"
                    min={data.today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="a-input px-2 py-1 text-[13px]"
                  />
                  <span className="a-label">Termin</span>
                  <div className="flex gap-1">
                    {data.slots.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSlot(s)}
                        className={`rounded-[8px] px-2 py-1 text-[12.5px] font-semibold ${slot === s ? "bg-[var(--a-text)] text-[var(--a-card)]" : "bg-[var(--a-card)] text-[var(--a-text)]"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {data.bestSlot && <Pill tone="info">Instagram: publika najaktivnija oko {data.bestSlot}</Pill>}
                  {dirty && <span className="font-semibold text-[var(--a-warn)]">Prvo spremi izmijenjeni tekst.</span>}
                  <button type="button" className="a-btn a-btn-primary px-3 py-1.5" disabled={Boolean(busy) || dirty} onClick={() => act("schedule", { date, slot })}>
                    {busy === "schedule" ? "Zakazujem…" : "Zakaži"}
                  </button>
                </div>
              )}

              {panel === "return" && (
                <div className="space-y-2 rounded-[12px] bg-[var(--a-surface-2)] p-3 text-[13px]">
                  <div>Napiši agentu što da promijeni. Novu verziju šalje sutra ujutro.</div>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="a-input w-full px-3 py-2 text-[13px]" placeholder="npr. druga fotka, manje statistike" />
                  <button type="button" className="a-btn a-btn-primary px-3 py-1.5" disabled={Boolean(busy) || !comment.trim()} onClick={() => act("return", { comment })}>
                    Vrati agentu
                  </button>
                </div>
              )}
            </div>
          )}

          {msg && (
            <div role="status" className={`text-[13px] font-semibold ${msg.ok ? "text-[var(--a-good)]" : "text-[var(--a-bad)]"}`}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ————————————————————————————————————————————————————————————————
// Kalendar: idućih 14 dana, 1 feed objava dnevno (cilj 7 tjedno)
// ————————————————————————————————————————————————————————————————
function CalendarView({ data }: { data: Payload }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(data.today, i));
  const planned = data.items.filter((i) => i.kind === "DRAFT" && (i.status === "ZAKAZANO" || i.status === "OBJAVLJENO") && (i.scheduledAt || i.publishedAt));
  const byDay = new Map<string, Item[]>();
  for (const it of planned) {
    const d = zagrebDateOf((it.status === "ZAKAZANO" ? it.scheduledAt : it.publishedAt) || it.createdAt);
    byDay.set(d, [...(byDay.get(d) || []), it]);
  }
  const weekCount = days.slice(0, 7).filter((d) => (byDay.get(d) || []).some((x) => x.format !== "STORY_MANUAL")).length;

  return (
    <div className="space-y-3">
      <div className="a-card flex flex-wrap items-center justify-between gap-2 p-4">
        <div className="text-[14px] text-[var(--a-text)]">
          Idućih 7 dana: <b>{weekCount}/7</b> dana s feed objavom
        </div>
        <div className="text-[12px] text-[var(--a-text-3)]">Cilj: 1 objava dnevno + storyji · termini 12:00 · 18:00 · 19:30 · 21:00</div>
      </div>
      <div className="a-card divide-y divide-[var(--a-line)]">
        {days.map((d) => {
          const list = (byDay.get(d) || []).sort((a, b) => String(a.scheduledAt || a.publishedAt).localeCompare(String(b.scheduledAt || b.publishedAt)));
          const hasFeed = list.some((x) => x.format !== "STORY_MANUAL");
          return (
            <div key={d} className="grid grid-cols-[150px_1fr] items-start gap-3 px-4 py-3 text-[13.5px]">
              <div className={`font-semibold tabular-nums ${d === data.today ? "text-[var(--a-text)]" : "text-[var(--a-text-2)]"}`}>
                {fmtDay(d)}
                {d === data.today && <div className="text-[11px] font-bold text-[var(--a-text-3)]">danas</div>}
              </div>
              <div className="min-w-0 space-y-1">
                {list.map((it) => (
                  <div key={it.id} className="flex flex-wrap items-center gap-2">
                    <span className="tabular-nums text-[var(--a-text-2)]">{fmtWhen((it.scheduledAt || it.publishedAt)!).split(" ").at(-1)}</span>
                    <span className="truncate text-[var(--a-text)]">
                      <b>{it.series || "Objava"}</b> · {it.title}
                    </span>
                    <Pill tone={it.status === "OBJAVLJENO" ? "good" : "info"}>{STATUS_LABEL[it.status]}</Pill>
                  </div>
                ))}
                {!hasFeed && <Pill tone="warn">Nema zakazane objave</Pill>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// Arhiva: sve teme (agenti je čitaju preko /api/media/feedback)
// ————————————————————————————————————————————————————————————————
function ArchiveView({ data, onChange }: { data: Payload; onChange: (i: Item) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const list = data.items.filter((i) => i.kind !== "BRIEF");
  if (list.length === 0) return <div className="a-card p-6 text-sm text-[var(--a-text-3)]">Arhiva je prazna.</div>;
  return (
    <div className="a-card divide-y divide-[var(--a-line)]">
      {list.map((it) => (
        <div key={it.id} className="px-4 py-3">
          <button type="button" onClick={() => setOpen(open === it.id ? null : it.id)} className="grid w-full grid-cols-[86px_1fr_auto] items-center gap-3 text-left text-[13.5px]">
            <span className="tabular-nums text-[var(--a-text-2)]">{it.runDate.slice(8, 10)}.{it.runDate.slice(5, 7)}.</span>
            <span className="min-w-0 truncate text-[var(--a-text)]">
              <b>{it.kind === "IDEA" ? "Ideja" : it.series || "Nacrt"}</b> · {it.title}
            </span>
            <span className="flex gap-1.5">
              {it.rating ? <Pill tone={it.rating >= 3 ? "good" : "warn"}>{RATING_LABEL[it.rating]}</Pill> : null}
              {it.kind === "DRAFT" && <Pill tone={it.status === "OBJAVLJENO" ? "good" : it.status === "ODBIJENO" ? "bad" : "neutral"}>{STATUS_LABEL[it.status] || it.status}</Pill>}
            </span>
          </button>
          {open === it.id && it.kind === "DRAFT" && (
            <div className="mt-3">
              <DraftCard item={it} index={1} total={1} data={data} onChange={onChange} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
