# Mini igre v2: zajednički okvir

Sve nove igre koriste ovaj okvir, tako da start, HUD, pauza, rezultat, rekord, zvuk i dijeljenje izgledaju i rade isto. Primjer minimalne igre: `demo-tap-game.tsx` (nema svoju rutu; `previewRewards` prikaže samo dizajn kartice nagrade i ništa ne sprema).

## Nagrade su ugašene

`config.ts` → `GAME_REWARDS_ENABLED = false`. Dok je tako:
- nema kartice nagrade, nema kodova, ništa se ne sprema;
- na stranicama igara, u metapodacima, u hubu i u CTA tekstovima nigdje ne pišite **popust / nagrada / kod / besplatna dostava**.

Igrače motiviraju osobni rekord (radi sam), dnevni niz (`useDailyStreak`), slika rezultata za story (gumb "Podijeli") i sama igra. Kad vlasnik upali nagrade, `<GameShell>` sam prikaže karticu prema pragovima iz `GAME_REWARDS[gameId]` ili prema `rewardTiers`. Nove kodove ne izmišljajte. Smiju se koristiti samo kodovi iz `lib/promo.ts`.

## Datoteke

| datoteka | što radi |
|---|---|
| `game-shell.tsx` | `GameShell` i dijelovi: `GameStage`, `StartScreen`, `Hud`, `HudStat`, `HudTimer`, `PauseScreen`, `ResultScreen`, `RewardCard`, `PrimaryButton`, `SecondaryButton`, `MuteButton`, `useFastTap`, `useStageLayout`. Ponovno izvozi sve iz `hooks.ts`. |
| `hooks.ts` | `useCanvas`, `useGameLoop`, `usePointer`, `useBestScore`, `useMute`, `useDailyStreak`, `useScrollLock`, `useCountUp`, `useLandscapeTouch` |
| `draw.ts` | canvas alati: `brandFont`, `ensureBrandFonts`, `ease`, `clamp/lerp/damp/rand`, `roundRect`, `softShadow`, `loadImage`, `createParticles`, `createShake`, `BRAND` |
| `sfx.ts` | WebAudio zvukovi bez datoteka: `sfx.kick/whistle/crowd/coin/success/fanfare/fail/tick/wheelClick/whoosh/tap`, `haptic`, `unlockAudio`, `setMuted/isMuted/toggleMuted/subscribeMute` (ključ `dresify_game_mute`) |
| `share-card.ts` | story slika 1080x1920: `renderShareCard`, `prepareShareCard`, `shareFile`, `shareScoreCard` |
| `config.ts` | `GAME_REWARDS_ENABLED`, tipovi `RewardTier`/`RewardPrize`, `GAME_REWARDS`, `arcadeTiers()` |
| `rewards.ts` | `pickReward`, `nextReward`, `claimPrize`, `formatPrize`, `tiersFor`, `rewardsEnabled` (sve poštuju prekidač) |

## Primjer

```tsx
"use client";
import { Hand, Timer } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { GameShell, HudStat, HudTimer, useCanvas, useGameLoop, usePointer, type GameResult, type GameState } from "@/components/game/v2/game-shell";
import { createParticles, createShake, brandFont } from "@/components/game/v2/draw";
import { sfx } from "@/components/game/v2/sfx";

export function MojaIgra() {
  const [state, setState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const { canvasRef, view } = useCanvas();            // view.current = { ctx, w, h, dpr } in CSS px
  const sim = useRef({ score: 0, t: 30 });
  const fx = useRef(createParticles());

  const start = useCallback(() => { sim.current = { score: 0, t: 30 }; setScore(0); setResult(null); setState("playing"); sfx.whistle(); }, []);

  usePointer(canvasRef, { onDown: (p) => { if (state !== "playing") return; sim.current.score++; setScore(sim.current.score); fx.current.burst(p.x, p.y); sfx.kick(); } });

  useGameLoop({
    running: state === "playing",                      // update se zove samo dok traje igra
    update: (dt) => {                                  // fiksni korak (1/120 s)
      const s = sim.current; if (s.t <= 0) return;     // zaštita: igra može završiti samo jednom
      s.t -= dt;
      if (s.t <= 0) { setResult({ score: s.score }); setState("result"); sfx.whistle(true); }
    },
    render: ({ dt }) => {                              // svaki frejm, i na startnom ekranu
      const { ctx, w, h } = view.current; if (!ctx) return;
      fx.current.update(dt);
      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, w, h);
      fx.current.draw(ctx);
    }
  });

  return (
    <GameShell
      gameId="moja-igra" title="Moja igra" kicker="Mini igra"
      description="Jedna rečenica što se radi."
      bestKey="dresify_v2_best_moja"
      rules={[{ icon: Hand, text: "Tapni ..." }, { icon: Timer, text: "30 sekundi" }]}
      state={state} onStart={start}
      onPause={() => setState("paused")} onResume={() => setState("playing")}
      result={result} scoreLabel="bodova"
      hud={<><HudStat label="Bodovi" value={score} accent bump={score} /><HudTimer seconds={timeLeft} total={30} /></>}  // timeLeft: useState osvježen setIntervalom ~80 ms dok traje igra (vidi demo-tap-game.tsx), ne svaki frejm
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </GameShell>
  );
}
```

Stranica igre: komponentu stavi kao **prvi element** stranice, bez `section-pad`/`page-shell` omotača. Okvir se sam proteže preko cijele širine i popuni visinu ekrana ispod zaglavlja, iznad donje navigacije. Tekst za SEO (h1, opis) stavi ispod igre.

## `<GameShell>` props

| prop | tip | napomena |
|---|---|---|
| `gameId` | `string` | ključ u `GAME_REWARDS` (`penalty`, `quiz`, `memory`, `flappy`, `snake`, `catch`, `runner`, `shooter`, `arcade`) ili novi |
| `title`, `description` | `string` | naslov (font-heading) i jedna rečenica |
| `kicker?` | `string` | mali natpis iznad naslova, default "Mini igra" |
| `bestKey` | `string` | localStorage ključ rekorda, npr. `dresify_v2_best_<igra>` |
| `rules?` | `{ icon: LucideIcon; text: string }[]` | 2–3 retka "kako se igra" |
| `state` | `"start" \| "playing" \| "paused" \| "result"` | stanjem upravlja igra |
| `onStart` | `() => void` | gumbi "Igraj", "Igraj ponovno" i "Kreni ispočetka"; zvuk je već otključan |
| `onPause?` / `onResume?` | `() => void` | ako postoji `onPause`, HUD dobije gumb pauze, a igra se sama pauzira kad se kartica sakrije |
| `result?` | `{ score; title?; message?; display? }` | obavezno kad je `state === "result"`; `display` služi za "9/10" ili "0:42"; rekord se sprema točno jednom po ulasku u "result" (vidi "Rekord" niže) |
| `hud?` | `ReactNode` | lijevi dio gornje trake (`HudStat`, `HudTimer`); desno su pauza i zvuk |
| `scoreLabel?` | `string` | "bodova", "golova", "točnih" (rezultat i slika) |
| `formatScore?` | `(n) => string` | |
| `lowerIsBetter?` | `boolean` | npr. vrijeme: manje je bolje |
| `rewardTiers?` | `RewardTier[]` | zamjenjuje `GAME_REWARDS[gameId]` |
| `previewRewards?` | `boolean` | samo za demo/pregled dizajna |
| `shareImage?` | `string \| null` | slika na story kartici, default `/mix/lopta-hrvatska.webp` |
| `startExtra?` / `resultExtra?` | `ReactNode` | npr. dnevni niz ili pregled odgovora |
| `ctaLabel?` | `string` | default "Igraj" |
| `shopHref?` | `string` | default `/dresovi` |
| `landscape?` | `"fit" \| "portrait"` | položeni mobitel, default `"fit"` (vidi niže) |
| `children` | `ReactNode` | sloj igre (canvas ili React UI), uvijek montiran |

`GameStage` stavlja `data-state` (i `data-land` na položenom mobitelu) na `.g2-stage`, što je zgodno za Playwright testove. Dok je okvir na stranici, plutajući gumb pomoći, social-proof toast i obavijest o kolačićima (`[data-cookie-notice]`) su skriveni; na drugim stranicama se obavijest opet pokaže.

## Rekord

`useBestScore().submit(score)` vraća `{ record, first, tie, previous, best }`:
- rezultat `<= 0` se ne pamti (nema "Rekord 0"), pa ni startni ekran ne pokazuje rekord dok ga nema;
- `first`: prva igra s rezultatom, na rezultatu piše "Tvoj prvi rekord" (bez fanfara, to nije "novi rekord");
- `record`: nadmašen raniji rekord, "Novi rekord" + konfete;
- `tie`: "Izjednačen rekord X"; inače "Rekord X · još N do njega".

`ResultScreen` (ako ga slažete sami) prima i `first?` / `tie?`.

## Visina i položeni mobitel

- Na mobitelu okvir točno popuni prostor između zaglavlja (i trake s obavijesti) i donje navigacije, i nikad ne ulazi ispod nje (minimum 360 px). Startni ekran i rezultat se sami zbiju ako sadržaj ne stane (mjeri se, ne pogađa): manji naslov i broj, manji razmaci, "Podijeli" i "Dresovi" u jednom redu, na najmanjem ekranu startni ekran skrije opis. Vaš `startExtra`/`resultExtra` neka bude što niži; sve mora stati na iPhone SE (320x568) s božićnom trakom.
- Položeni mobitel (dodir, visina <= 540 px) → okvir preuzme cijeli ekran, preko zaglavlja i donje navigacije:
  - `landscape="fit"` (default): igra dobije cijeli položeni ekran (canvas mora podnijeti širok omjer), startni ekran i rezultat su u dva stupca;
  - `landscape="portrait"`: preko igre stoji poruka "Okreni mobitel", a igra se sama pauzira (ako postoji `onPause`). Za igre koje bez uspravnog ekrana nemaju smisla.
- `useStageLayout().land` (`"fit" | "portrait" | null`) u vlastitim dijelovima igre (npr. `startExtra`) služi za drugačiji raspored na položenom ekranu.

## Pravila za iPhone (već riješeno u okviru)

- `touch-action: none` na canvasu i `manipulation` na okviru; spriječeni su pinch-zoom, dvostruki dodir i scroll stranice dok igra traje (`useScrollLock`).
- DPR je ograničen na 2, a `ResizeObserver` radi resize.
- Petlja stane kad je kartica skrivena, `dt` je ograničen pa nema skoka.
- Gumbi reagiraju na `pointerup` (`useFastTap`), pa brzi drugi dodir ne "proguta" klik.
- Zvuk se otključa na prvoj gesti. Mute se pamti u `dresify_game_mute`.
- Story sliku `ResultScreen` priprema unaprijed, pa `navigator.share` ostaje unutar geste. Ako dijeljenje nije podržano, slika se preuzme kao PNG.

## Pravila izgleda

Nema emojija ni `backdrop-blur` na velikim plohama. Boje: `#0a0a0a` i accent `#e8ff3c`. Naslovi `font-heading`, uppercase. Tekst neka bude prirodan hrvatski, kratak. Na canvasu crtaj tekst s `brandFont("heading", px)` (prije toga jednom `await ensureBrandFonts()`). Trešnju ekrana (`createShake`) koristi umjereno: `add(0.1–0.4)`.
