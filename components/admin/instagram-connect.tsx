"use client";

import { useEffect, useState } from "react";

import { adminPost } from "@/lib/admin-fetch";

type Status = {
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  connectedBy: string | null;
};

// "Poveži Instagram": Gazda zalijepi token iz Graph API Explorera; server ga
// razmijeni u long-lived (60 dana) i spremi šifrirano. Token se NE šalje nikamo
// osim na naš server (POST /api/admin/instagram/). Vidljivo samo vlasniku.
export function InstagramConnect({ isOwner }: { isOwner: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/admin/instagram/", { cache: "no-store" });
      const d = await r.json();
      if (d?.ok) setStatus({ connected: d.connected, username: d.username, expiresAt: d.expiresAt, connectedBy: d.connectedBy });
    } catch {
      /* offline */
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    const t = token.trim();
    if (t.length < 20) {
      setMsg("Zalijepi cijeli token iz Graph API Explorera.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await adminPost("/api/admin/instagram/", { token: t });
    setBusy(false);
    if (!res) return; // adminPost je već javio grešku
    const d = await res.json().catch(() => ({}));
    if (d?.ok) {
      setToken("");
      setShow(false);
      setMsg(`✅ Spojeno${d.username ? ` kao @${d.username}` : ""}!`);
      load();
    } else {
      setMsg(d?.message || "Spajanje nije uspjelo.");
    }
  }

  const inp = "a-input w-full px-3 py-2 text-sm";
  const fmtDate = (s: string | null) => {
    if (!s) return null;
    try {
      return new Date(s).toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return null;
    }
  };

  return (
    <div className="a-card p-5">
      <div className="a-label mb-3">🔗 Poveži Instagram</div>

      {status?.connected ? (
        <div className="rounded-[12px] border border-[var(--a-good)]/30 bg-[var(--a-good-bg)] px-4 py-3 text-sm">
          <div className="font-semibold text-[var(--a-good)]">✅ Spojeno{status.username ? ` kao @${status.username}` : ""}</div>
          {fmtDate(status.expiresAt) && <div className="mt-0.5 text-[12px] text-[var(--a-text-3)]">Token vrijedi do {fmtDate(status.expiresAt)} (sam se produžuje).</div>}
          {status.connectedBy && <div className="text-[12px] text-[var(--a-text-3)]">Spojio: {status.connectedBy}</div>}
        </div>
      ) : (
        <p className="mb-3 text-sm text-[var(--a-text-3)]">Instagram još nije spojen — statistika i objava neće raditi dok ne zalijepiš token.</p>
      )}

      {isOwner ? (
        <div className="mt-4">
          <div className="a-label mb-1 block">{status?.connected ? "Ponovno spoji (novi token)" : "Zalijepi token"}</div>
          <div className="flex gap-2">
            <input
              type={show ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token iz Graph API Explorera…"
              autoComplete="off"
              spellCheck={false}
              className={inp}
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="a-btn a-btn-sm shrink-0 px-3" title={show ? "Sakrij" : "Pokaži"}>
              {show ? "🙈" : "👁"}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={save} disabled={busy} className="a-btn a-btn-primary px-4 py-2 text-sm disabled:opacity-60">
              {busy ? "Spajam…" : "Spremi token"}
            </button>
            {msg && <span className="text-[13px] text-[var(--a-text-2)]">{msg}</span>}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--a-text-3)]">
            Token dobiješ u Graph API Exploreru (Meta) → „Generate Access Token&quot;. Ovdje ga zalijepi — server ga automatski produži na 60 dana i
            dalje sam osvježava. Token se čuva šifrirano i nikad se ne prikazuje.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-[var(--a-text-3)]">Instagram spaja vlasnik (Igor).</p>
      )}
    </div>
  );
}
