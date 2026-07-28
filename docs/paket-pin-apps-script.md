# Automatski uvoz GLS paketomat PIN-ova (paket.hr → Dresify)

Cilj: kad paket.hr pošalje mail s PIN-om, Apps Script ga pročita, izvuče PIN + ime
primatelja, i pošalje u Dresify. U adminu (filter 🚚 Poslano GLS) svaka narudžba
onda pokazuje 🔑 PIN — na paketomatu samo prepišeš, bez kopanja po mailu.

## Format maila (paket.hr)

- Plavo polje: `Tvoj PIN kod za otvaranje pretinca na paketomatu: 91092404`
- `ID narudžbe` (paket.hr interni broj) — za dedupe
- Blok `Informacije o primatelju` → `Ime` / `Prezime` (kupac) — po tome spajamo na narudžbu

## Postavljanje (jednom)

1. **Vercel env var** — dodaj u Dresify projekt (Settings → Environment Variables):
   - `PIN_IMPORT_SECRET` = neki dugačak nasumičan niz (npr. 32 znaka). Zapamti ga.
   - Redeploy nakon dodavanja.
2. **Apps Script** — u istoj skripti gdje ti je već GA/narudžbe, dodaj funkciju ispod.
3. U `CONFIG` upiši isti `SECRET` kao gore.
4. **Trigger**: Apps Script → ⏰ Triggers → Add Trigger → funkcija `uvoziSve`
   (obrađuje i PIN-ove i tracking brojeve), event source **Time-driven**,
   **Minutes timer**, **Every 10 minutes**.
5. Klikni **Run** jednom ručno da odobriš Gmail dozvole.

## Kod

```javascript
var CONFIG = {
  URL: "https://dresifyshop.com/api/pin-import/",
  SECRET: "OVDJE-ISTI-KLJUC-KAO-U-VERCELU",
  LABEL_DONE: "pin-uvezen",         // obrađeni PIN mailovi
  LABEL_UNMATCHED: "pin-nespojen",  // PIN nije spojen na narudžbu (provjeri ručno)
  LABEL_TRACK: "tracking-uvezen"    // obrađeni tracking mailovi
};

// Trigger neka poziva OVU funkciju — obradi i PIN-ove i tracking brojeve.
function uvoziSve() {
  uvoziPinove();
  uvoziTracking();
}

function uvoziPinove() {
  var done = getOrCreateLabel_(CONFIG.LABEL_DONE);
  var unmatched = getOrCreateLabel_(CONFIG.LABEL_UNMATCHED);

  // Traži mailove s PIN-om koje još nismo obradili (zadnjih 14 dana).
  var query = '"Tvoj PIN kod za otvaranje pretinca na paketomatu" -label:' +
              CONFIG.LABEL_DONE + ' newer_than:14d';
  var threads = GmailApp.search(query, 0, 50);

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    var msgs = thread.getMessages();
    var anyMatched = false;

    for (var m = 0; m < msgs.length; m++) {
      var body = msgs[m].getPlainBody();
      var data = parsePin_(body);
      if (!data.pin) continue;

      var res = postPin_(data);
      if (res && res.matched) anyMatched = true;
      Logger.log("PIN %s (%s %s) -> matched=%s", data.pin, data.ime, data.prezime, res && res.matched);
    }

    thread.addLabel(done);
    if (!anyMatched) thread.addLabel(unmatched); // da lako nađeš nespojene
  }
}

function parsePin_(body) {
  var out = { pin: "", ime: "", prezime: "", paketId: "" };

  var pin = body.match(/paketomatu\s*:?\s*([0-9]{4,})/i);
  if (pin) out.pin = pin[1];

  var pid = body.match(/ID\s*narud\S*be[\s\S]{0,40}?([0-9]{4,})/i);
  if (pid) out.paketId = pid[1];

  // Ime/Prezime SAMO iz bloka primatelja (ne pošiljatelja = Dresify).
  var idx = body.search(/Informacije\s+o\s+primatelju/i);
  var recip = idx >= 0 ? body.slice(idx) : body;
  var slovo = "A-Za-zČĆŽŠĐčćžšđ\\-";
  var ime = recip.match(new RegExp("Ime[\\s\\S]{0,40}?([" + slovo + "]{2,})", "i"));
  var prz = recip.match(new RegExp("Prezime[\\s\\S]{0,40}?([" + slovo + "]{2,})", "i"));
  if (ime) out.ime = ime[1];
  if (prz) out.prezime = prz[1];

  return out;
}

// ── Tracking brojevi (drugi paket.hr mail: "Broj paketa za praćenje") ──
function uvoziTracking() {
  var done = getOrCreateLabel_(CONFIG.LABEL_TRACK);
  var query = '"Broj paketa za praćenje" -label:' + CONFIG.LABEL_TRACK + ' newer_than:14d';
  var threads = GmailApp.search(query, 0, 50);

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    var msgs = thread.getMessages();
    for (var m = 0; m < msgs.length; m++) {
      var body = msgs[m].getPlainBody();
      var d = parseTracking_(body);
      if (!d.tracking || !d.paketId) continue;
      var res = postPin_(d); // isti endpoint — po paketId spaja tracking na narudžbu
      Logger.log("TRACK %s (paketId %s) -> matched=%s", d.tracking, d.paketId, res && res.matched);
    }
    thread.addLabel(done);
  }
}

function parseTracking_(body) {
  var out = { tracking: "", paketId: "" };
  var tr = body.match(/Broj\s*paketa\s*za\s*pra[ćc]enje\s*:?\s*([0-9]{6,})/i);
  if (tr) out.tracking = tr[1];
  // "Broj narudžbe je #811419" — isti paket.hr ID kao u PIN mailu (po njemu spajamo).
  var pid = body.match(/Broj\s*narud\S*be[\s\S]{0,20}?#?\s*([0-9]{4,})/i);
  if (pid) out.paketId = pid[1];
  return out;
}

function postPin_(data) {
  try {
    var resp = UrlFetchApp.fetch(CONFIG.URL, {
      method: "post",
      contentType: "application/json",
      headers: { "x-pin-secret": CONFIG.SECRET },
      payload: JSON.stringify(data),
      muteHttpExceptions: true,
      followRedirects: true
    });
    return JSON.parse(resp.getContentText());
  } catch (e) {
    Logger.log("Greška slanja PIN-a: " + e);
    return null;
  }
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
```

## Kako spaja na narudžbu

Po **imenu i prezimenu** primatelja (bez dijakritike). Ako ima više kupaca istog
imena, uzima onaj **bez PIN-a**, **GLS/prazan kurir**, i **najnoviju** narudžbu.
Idempotentno je: isti PIN / isti paket.hr ID neće se dvaput upisati.

> Za 100% točno spajanje čak i kod istih imena: kad kreiraš pošiljku na paket.hr,
> upiši Dresify referencu (npr. `DRS-...`) u polje **Referenca**. Trenutno je prazno,
> pa spajamo po imenu — što za tvoj volumen radi dobro.
