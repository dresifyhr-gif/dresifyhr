import "server-only";

import { unstable_cache } from "next/cache";

// Meta Ads Insights (read-only) — povlači potrošnju + rezultate reklama IZRAVNO
// iz Meta Marketing API-ja i prikazuje ih u adminu pored profita. NE troši novac,
// NE kreira reklame — samo čita. Tako Igor odmah vidi koja kampanja zarađuje.
//
// Treba:
//  - META_AD_ACCOUNT_ID  → npr. "act_1234567890" (Ads Manager → Postavke računa)
//  - META_ADS_TOKEN      → token s ads_read dozvolom (fallback na META_CAPI_TOKEN)
// Bez njih panel tiho pokaže "nije povezano".

const API_VERSION = "v21.0";

export type AdCampaign = {
  id: string;
  name: string;
  spend: number; // potrošeno €
  purchases: number; // broj kupnji (piksel/CAPI)
  revenue: number; // vrijednost kupnji €
  roas: number; // povrat na potrošeno (revenue / spend)
  clicks: number; // klikovi na link
  ctr: number; // % klikova
  cpc: number; // cijena po kliku €
};

export type MetaAdsInsights = {
  ok: boolean;
  reason?: "no-config" | "error";
  datePreset: string;
  totals: { spend: number; purchases: number; revenue: number; roas: number; clicks: number };
  campaigns: AdCampaign[];
};

const EMPTY = (reason: MetaAdsInsights["reason"]): MetaAdsInsights => ({
  ok: false,
  reason,
  datePreset: "last_30d",
  totals: { spend: 0, purchases: 0, revenue: 0, roas: 0, clicks: 0 },
  campaigns: []
});

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Iz Meta "actions"/"action_values" izvuče kupnje (piksel + CAPI, offsite + onsite).
const PURCHASE_TYPES = new Set([
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_web_purchase",
  "omni_purchase"
]);
function sumPurchase(rows: unknown): number {
  if (!Array.isArray(rows)) return 0;
  // Uzmi najveću vrijednost među purchase tipovima (izbjegni dvostruko brojanje piksel+CAPI+omni).
  let max = 0;
  for (const r of rows as Record<string, unknown>[]) {
    if (PURCHASE_TYPES.has(String(r.action_type))) max = Math.max(max, num(r.value));
  }
  return max;
}

async function fetchInsightsRaw(): Promise<MetaAdsInsights> {
  const account = process.env.META_AD_ACCOUNT_ID;
  const token = process.env.META_ADS_TOKEN || process.env.META_CAPI_TOKEN;
  if (!account || !token) return EMPTY("no-config");

  const acct = account.startsWith("act_") ? account : `act_${account}`;
  const fields = ["campaign_id", "campaign_name", "spend", "clicks", "ctr", "cpc", "actions", "action_values"].join(",");
  const url =
    `https://graph.facebook.com/${API_VERSION}/${acct}/insights` +
    `?level=campaign&date_preset=last_30d&limit=100&fields=${fields}&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error("[meta-insights] HTTP", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return EMPTY("error");
    }
    const d = await res.json().catch(() => null);
    if (!d || !Array.isArray(d.data)) return EMPTY("error");

    const campaigns: AdCampaign[] = d.data.map((row: Record<string, unknown>) => {
      const spend = num(row.spend);
      const purchases = sumPurchase(row.actions);
      const revenue = sumPurchase(row.action_values);
      return {
        id: String(row.campaign_id ?? ""),
        name: String(row.campaign_name ?? "Kampanja"),
        spend,
        purchases,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        clicks: num(row.clicks),
        ctr: num(row.ctr),
        cpc: num(row.cpc)
      };
    });
    campaigns.sort((a, b) => b.spend - a.spend);

    const totals = campaigns.reduce(
      (t, c) => ({
        spend: t.spend + c.spend,
        purchases: t.purchases + c.purchases,
        revenue: t.revenue + c.revenue,
        clicks: t.clicks + c.clicks,
        roas: 0
      }),
      { spend: 0, purchases: 0, revenue: 0, clicks: 0, roas: 0 }
    );
    totals.roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

    return { ok: true, datePreset: "last_30d", totals, campaigns };
  } catch (e) {
    console.error("[meta-insights] error", e);
    return EMPTY("error");
  }
}

// Keširano 10 min — reklame se ne mijenjaju iz sekunde u sekundu, a API ima kvotu.
export const getMetaAdsInsights = unstable_cache(fetchInsightsRaw, ["meta-ads-insights"], { revalidate: 600 });
