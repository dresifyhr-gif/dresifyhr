"use client";

import { useRef, useState } from "react";

// Masovno generiranje JEDINSTVENIH opisa proizvoda.
// Automatski opis je bio ~80% isti na svim stranicama, pa Google 71 stranicu
// nije indeksirao ("Discovered – currently not indexed"). Ovdje AI napiše
// poseban opis za svaki proizvod koji ga još nema.
export function DescriptionGenerator() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  // Ref, ne state: petlja ispod čita vrijednost NAKON await-a, a state bi
  // ostao zarobljen u closureu pa gumb "Zaustavi" ne bi radio.
  const stopRef = useRef(false);

  async function run(force: boolean) {
    if (running) return;
    if (typeof window !== "undefined") {
      const q = force
        ? "Prepisati opise SVIH proizvoda (i one koje si ručno pisao)?"
        : "Napisati opise za proizvode koji ih još nemaju?";
      if (!window.confirm(q)) return;
    }
    setRunning(true);
    stopRef.current = false;
    setDone(0);
    setMsg("");

    let total = 0;
    for (;;) {
      const d = await fetch("/api/admin/generate-descriptions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: 3, force })
      }).then((r) => r.json()).catch(() => null);

      if (!d?.ok) {
        // Jedna spora serija ne smije srušiti cijelu rundu — probaj s jednim.
        const solo = await fetch("/api/admin/generate-descriptions/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batch: 1, force })
        }).then((r) => r.json()).catch(() => null);
        if (!solo?.ok || solo.done === 0) {
          setMsg(total > 0 ? `Stalo nakon ${total} opisa — klikni ponovno da nastavi.` : "Greška — pokušaj ponovno.");
          break;
        }
        total += solo.done;
        setDone(total);
        setRemaining(solo.remaining);
        if (solo.remaining === 0) { setMsg(`Gotovo — napisano ${total} opisa.`); break; }
        continue;
      }

      total += d.done;
      setDone(total);
      setRemaining(d.remaining);

      if (d.remaining === 0) { setMsg(`Gotovo — napisano ${total} opisa.`); break; }
      // done 0 uz remaining > 0 NIJE gotovo — nešto puca. Prije je i ovo pisalo
      // "Gotovo", pa je izgledalo kao da su svi opisi napisani.
      if (d.done === 0) {
        const why = d.errors?.[0]?.error ? ` (${d.errors[0].slug}: ${d.errors[0].error})` : "";
        setMsg(`Zapelo na ${d.remaining} proizvoda${why}`);
        break;
      }
      if (stopRef.current) { setMsg(`Zaustavljeno — napisano ${total} opisa.`); break; }
    }
    setRunning(false);
  }

  return (
    <div className="a-card mb-5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">✍️ Jedinstveni opisi (SEO)</div>
          <div className="mt-0.5 text-[12px] text-[#8e8e93]">
            Automatski opisi su gotovo isti na svim proizvodima, pa ih Google ne indeksira. AI napiše poseban opis za svaki.
          </div>
          {(running || msg) && (
            <div className="mt-2 text-[13px] font-medium text-[#1d1d1f]">
              {running ? `Pišem… ${done} gotovo${remaining != null ? `, još ${remaining}` : ""}` : msg}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button type="button" onClick={() => run(false)} disabled={running} className="a-btn a-btn-primary px-4 py-2 text-sm disabled:opacity-40">
            {running ? "Radim…" : "Napiši opise koji fale"}
          </button>
          {running ? (
            <button type="button" onClick={() => { stopRef.current = true; }} className="a-btn-sm px-3 py-2 text-sm">Zaustavi</button>
          ) : (
            <button type="button" onClick={() => run(true)} className="a-btn-sm px-3 py-2 text-sm">Prepiši sve</button>
          )}
        </div>
      </div>
    </div>
  );
}
