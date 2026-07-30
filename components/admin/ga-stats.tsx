import type { GaStats } from "@/lib/ga";
import { Panel } from "@/components/admin/ui";

// Prikaz Google Analytics brojki u adminu. Čisto renderiranje — podatke dohvaća
// stranica preko getGaStats() (lib/ga.ts).

function Trend({ now, prev }: { now: number; prev: number }) {
  if (prev <= 0) return null;
  const pct = Math.round(((now - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={`text-[12px] font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function Col({ title, rows, unit }: { title: string; rows: { label: string; value: number }[]; unit: string }) {
  // min-w-0: bez toga grid stavka ne smije biti uža od najduljeg naslova, pa
  // kolona bježi izvan kartice na mobitelu i brojke se odrežu. S min-w-0 truncate radi.
  return (
    <div className="min-w-0">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--a-text-3)]">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[13px] text-[#c7c7cc]">—</div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="min-w-0 truncate text-[var(--a-text)]">{r.label}</span>
              <span className="shrink-0 font-semibold text-[var(--a-text)]">
                {r.value.toLocaleString("hr-HR")} <span className="text-[10px] font-normal text-[var(--a-text-3)]">{unit}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GaStatsPanel({ ga }: { ga: GaStats }) {
  if (!ga.ok) {
    return (
      <Panel title="🌍 Posjete (Google Analytics)">
        <p className="text-sm text-[var(--a-text-3)]">
          Još nije spojeno. Kad odradiš Apps Script korak (kod ti je spreman), ovdje se povuku posjetitelji,
          države, najgledanije stranice i izvori prometa — bez otvaranja Google taba.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="🌍 Posjete (Google Analytics)">
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--a-text-3)]">Posjetitelji (7 dana)</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-[26px] font-bold leading-none text-[var(--a-text)]">{ga.visitors.toLocaleString("hr-HR")}</span>
            <Trend now={ga.visitors} prev={ga.visitorsPrev} />
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--a-text-3)]">Uživo (~30 min)</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[26px] font-bold leading-none text-[var(--a-text)]">{ga.realtime}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Col title="Odakle dolaze" rows={ga.sources.slice(0, 6).map((s) => ({ label: s.channel, value: s.sessions }))} unit="pos." />
        <Col title="Najgledanije" rows={ga.pages.slice(0, 6).map((p) => ({ label: p.title, value: p.views }))} unit="pregl." />
        <Col title="Države" rows={ga.countries.slice(0, 6).map((c) => ({ label: c.name, value: c.users }))} unit="ljudi" />
      </div>

      <p className="mt-3 text-[10px] text-[var(--a-text-3)]">Osvježava se svakih ~10 min. Puni izvještaji na analytics.google.com.</p>
    </Panel>
  );
}
