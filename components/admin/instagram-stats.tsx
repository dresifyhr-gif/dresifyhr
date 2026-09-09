import type { IgStats } from "@/lib/instagram";
import { Panel } from "@/components/admin/ui";

// Prikaz Instagram brojki. Čisto renderiranje — podatke dohvaća stranica preko
// getIgStats() (lib/instagram.ts). Ako nije spojeno (ok:false) → poruka.

function Trend({ now, prev }: { now: number | null; prev: number | null }) {
  if (now == null || prev == null || prev <= 0) return null;
  const pct = Math.round(((now - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={`text-[12px] font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function Big({ label, value, trend }: { label: string; value: string; trend?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--a-text-3)]">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-[26px] font-bold leading-none text-[var(--a-text)]">{value}</span>
        {trend}
      </div>
    </div>
  );
}

export function InstagramStatsPanel({ ig }: { ig: IgStats }) {
  if (!ig.ok) {
    return (
      <Panel title="📷 Instagram statistika">
        <p className="text-sm text-[var(--a-text-3)]">
          Još nije spojeno. Zalijepi token u kartici <b className="text-[var(--a-text-2)]">„Poveži Instagram&quot;</b> ispod, pa se
          ovdje povuku pratitelji, doseg i najbolji postovi — bez otvaranja Instagram aplikacije.
        </p>
      </Panel>
    );
  }

  const nf = (n: number | null) => (n == null ? "—" : n.toLocaleString("hr-HR"));

  return (
    <Panel title={`📷 Instagram${ig.username ? ` · @${ig.username}` : ""}`}>
      <div className="mb-5 flex flex-wrap items-end gap-x-8 gap-y-3">
        <Big label="Pratitelji" value={nf(ig.followers)} trend={<Trend now={ig.newFollowers7d != null ? ig.followers : null} prev={ig.newFollowers7d != null ? ig.followers - ig.newFollowers7d : null} />} />
        <Big label="Doseg (7 dana)" value={nf(ig.reach7d)} trend={<Trend now={ig.reach7d} prev={ig.reachPrev7d} />} />
        <Big label="Novi (7 dana)" value={ig.newFollowers7d == null ? "—" : `${ig.newFollowers7d >= 0 ? "+" : ""}${ig.newFollowers7d.toLocaleString("hr-HR")}`} />
        <Big label="Objava" value={nf(ig.mediaCount)} />
      </div>

      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--a-text-3)]">🏆 Najbolji postovi</div>
      {ig.topMedia.length === 0 ? (
        <div className="text-[13px] text-[var(--a-text-3)]">Još nema dohvaćenih postova.</div>
      ) : (
        <ul className="space-y-2">
          {ig.topMedia.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              {m.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumbnail} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" />
              ) : (
                <span className="h-11 w-11 shrink-0 rounded-[10px] bg-[var(--a-surface-2)]" />
              )}
              <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--a-text)]">{m.caption || "(bez opisa)"}</span>
              <span className="shrink-0 text-[12px] font-semibold text-[var(--a-text-2)]">❤ {m.likes.toLocaleString("hr-HR")}</span>
              <span className="shrink-0 text-[12px] font-semibold text-[var(--a-text-3)]">💬 {m.comments.toLocaleString("hr-HR")}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] text-[var(--a-text-3)]">Osvježava se svakih ~10 min. Doseg/novi pratitelji trebaju IG business račun i &gt;100 pratitelja.</p>
    </Panel>
  );
}
