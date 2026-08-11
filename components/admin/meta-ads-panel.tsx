import { Panel, eur } from "@/components/admin/ui";
import type { MetaAdsInsights } from "@/lib/meta-insights";

// Read-only pregled Meta reklama (zadnjih 30 dana). Ne troši ni ne kreira reklame.
const pct = (n: number) => `${(n ?? 0).toFixed(1).replace(".", ",")} %`;
const roasLabel = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")}×`;
const roasTone = (roas: number, spend: number) =>
  spend <= 0 ? "text-[var(--a-text-3)]" : roas >= 2 ? "text-emerald-500" : roas >= 1 ? "text-amber-500" : "text-red-500";

export function MetaAdsPanel({ ins }: { ins: MetaAdsInsights }) {
  if (!ins.ok) {
    return (
      <Panel title="Meta reklame (30 dana)">
        <div className="space-y-2 text-sm text-[var(--a-text-3)]">
          {ins.reason === "no-config" ? (
            <>
              <p className="text-[var(--a-text)]">Nije još povezano.</p>
              <p>Za prikaz potrošnje i rezultata dodaj u Vercel varijable:</p>
              <ul className="list-inside list-disc space-y-1 text-xs">
                <li><code>META_AD_ACCOUNT_ID</code> — npr. <code>act_1234567890</code> (Ads Manager → Postavke računa)</li>
                <li><code>META_ADS_TOKEN</code> — token s <code>ads_read</code> dozvolom (ili se koristi CAPI token)</li>
              </ul>
            </>
          ) : (
            <p>Trenutno ne mogu dohvatiti reklame (token/dozvola?). Pokušaj kasnije.</p>
          )}
        </div>
      </Panel>
    );
  }

  const t = ins.totals;
  return (
    <Panel title="Meta reklame (zadnjih 30 dana)">
      {/* Sažetak */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Potrošeno", value: eur(t.spend), tone: "text-[var(--a-text)]" },
          { label: "Kupnje", value: String(Math.round(t.purchases)), tone: "text-[var(--a-text)]" },
          { label: "Prihod", value: eur(t.revenue), tone: "text-[var(--a-text)]" },
          { label: "ROAS", value: roasLabel(t.roas), tone: roasTone(t.roas, t.spend) }
        ].map((s) => (
          <div key={s.label} className="rounded-[12px] bg-[var(--a-surface-2)] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[var(--a-text-3)]">{s.label}</div>
            <div className={`mt-1 text-lg font-bold ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {ins.campaigns.length === 0 ? (
        <div className="text-sm text-[var(--a-text-3)]">Nema aktivnih kampanja u zadnjih 30 dana.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                <th className="py-2 pr-2">Kampanja</th>
                <th className="py-2 px-2 text-right">Potroš.</th>
                <th className="py-2 px-2 text-right">Kupnje</th>
                <th className="py-2 px-2 text-right">ROAS</th>
                <th className="py-2 pl-2 text-right">Klikovi</th>
              </tr>
            </thead>
            <tbody>
              {ins.campaigns.map((c) => (
                <tr key={c.id} className="border-b border-[var(--a-border)]/50">
                  <td className="max-w-[220px] truncate py-2 pr-2 text-[var(--a-text)]" title={c.name}>{c.name}</td>
                  <td className="py-2 px-2 text-right text-[var(--a-text)]">{eur(c.spend)}</td>
                  <td className="py-2 px-2 text-right text-[var(--a-text)]">{Math.round(c.purchases)}</td>
                  <td className={`py-2 px-2 text-right font-semibold ${roasTone(c.roas, c.spend)}`}>{roasLabel(c.roas)}</td>
                  <td className="py-2 pl-2 text-right text-[var(--a-text-3)]">{c.clicks} · {pct(c.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-[var(--a-text-3)]">
        Zeleno ROAS ≥ 2× (dobro), žuto 1–2× (na granici), crveno &lt; 1× (gubitak). Podaci se osvježe svakih 10 min.
      </p>
    </Panel>
  );
}
