# Google Analytics u admin (Apps Script korak)

Admin (Analitika → "🌍 Posjete") povlači GA4 brojke preko tvog **postojećeg**
Apps Scripta — istog koji već nosi narudžbe. Bez servisnog računa, bez ključeva,
bez Google Clouda. Skripta se vrti pod tvojim Google računom, a ti si vlasnik GA
property-a, pa ima pristup.

**Property:** `530051929` (iz URL-a `a388933424p530051929` — dio iza `p`).

---

## Korak 1 — uključi "Analytics Data API" servis

U Apps Script editoru (isti projekt gdje ti je kod za narudžbe):

1. Lijevo klikni **Services** (＋ pored "Services").
2. Nađi **Google Analytics Data API** → **Add**.
3. Identifier ostavi `AnalyticsData`.

## Korak 2 — zalijepi funkciju

Zalijepi ovo na dno skripte (ne mijenja ništa postojeće):

```javascript
function getGaStats_() {
  var P = 'properties/530051929';

  // Posjetitelji: zadnjih 7 dana i prethodnih 7 (za trend gore/dolje)
  var vis = AnalyticsData.Properties.runReport({
    dateRanges: [
      { startDate: '7daysAgo',  endDate: 'today'    },
      { startDate: '14daysAgo', endDate: '8daysAgo' }
    ],
    metrics: [{ name: 'activeUsers' }]
  }, P);
  // Uz dva dateRanges GA4 SAM doda 'dateRange' dimenziju (date_range_0/1) — ne
  // smije se pisati u dimensions (baca "Field dateRange is not a dimension").
  var visitors = 0, visitorsPrev = 0;
  (vis.rows || []).forEach(function (r) {
    var v = Number(r.metricValues[0].value) || 0;
    if (r.dimensionValues[0].value === 'date_range_0') visitors = v; else visitorsPrev = v;
  });

  // Izvori prometa (zadnjih 7 dana)
  var src = AnalyticsData.Properties.runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 6
  }, P);
  var sources = (src.rows || []).map(function (r) {
    return { channel: r.dimensionValues[0].value, sessions: Number(r.metricValues[0].value) || 0 };
  });

  // Najgledanije stranice (zadnjih 7 dana)
  var pg = AnalyticsData.Properties.runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 6
  }, P);
  var pages = (pg.rows || []).map(function (r) {
    return { title: r.dimensionValues[0].value, views: Number(r.metricValues[0].value) || 0 };
  });

  // Države (zadnjih 7 dana)
  var ctry = AnalyticsData.Properties.runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: 6
  }, P);
  var countries = (ctry.rows || []).map(function (r) {
    return { name: r.dimensionValues[0].value, users: Number(r.metricValues[0].value) || 0 };
  });

  // Uživo (zadnjih 30 min)
  var realtime = 0;
  try {
    var rt = AnalyticsData.Properties.runRealtimeReport({ metrics: [{ name: 'activeUsers' }] }, P);
    if (rt.rows && rt.rows[0]) realtime = Number(rt.rows[0].metricValues[0].value) || 0;
  } catch (e) {}

  return { ok: true, visitors: visitors, visitorsPrev: visitorsPrev, realtime: realtime,
           sources: sources, pages: pages, countries: countries };
}
```

## Korak 3 — spoji na doGet

U tvom postojećem `doGet(e)`, na vrh (prije ostalog), dodaj ovu granu:

```javascript
  if (e && e.parameter && e.parameter.action === 'ga') {
    return ContentService
      .createTextOutput(JSON.stringify(getGaStats_()))
      .setMimeType(ContentService.MimeType.JSON);
  }
```

## Korak 4 — redeploy

**Deploy → Manage deployments → (olovka) → Version: New version → Deploy.**
(Kao i za narudžbe — bez novog deploya promjena ne vrijedi.)

## Korak 5 — uključi u Vercelu

U Vercel → Project → Settings → Environment Variables dodaj:

```
GA_STATS_ENABLED = 1
```

Redeploy shopa (ili само sačekaj sljedeći). Gotovo — Analitika povlači brojke.

---

**Provjera:** otvori u pregledniku `TVOJ_WEBHOOK_URL?action=ga` — mora vratiti
JSON s `"ok":true` i brojkama. Ako vrati grešku, najčešće je Korak 1 (servis
nije dodan) ili Korak 4 (nije redeployano).
