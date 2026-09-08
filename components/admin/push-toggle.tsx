"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

type State = "loading" | "unsupported" | "not-configured" | "ios-install" | "off" | "on" | "denied" | "working";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (isIOS() && !isStandalone()) return setState("ios-install");
      if (!supported) return setState("unsupported");
      if (!VAPID_PUBLIC) return setState("not-configured");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  async function enable() {
    setState("working");
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
      });
      const res = await fetch("/api/admin/push/subscribe/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() })
      });
      if (!res.ok) throw new Error("subscribe failed");
      setState("on");
      setMsg("Obavijesti uključene za ovaj uređaj. 🎉");
    } catch (e) {
      console.error(e);
      setState("off");
      setMsg("Nešto nije prošlo. Pokušaj ponovno.");
    }
  }

  async function disable() {
    setState("working");
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push/unsubscribe/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("Obavijesti isključene za ovaj uređaj.");
    } catch {
      setState("on");
    }
  }

  async function test() {
    setMsg("Šaljem test…");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const res = await fetch("/api/admin/push/test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub?.endpoint })
      });
      const d = await res.json();
      setMsg(d.ok ? "Poslano — provjeri obavijest. 📲" : "Nije poslano (provjeri je li uključeno).");
    } catch {
      setMsg("Test nije prošao.");
    }
  }

  const badge = (text: string, tone: "good" | "warn" | "bad" | "info") => (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ background: `var(--a-${tone}-bg)`, color: `var(--a-${tone})` }}
    >
      {text}
    </span>
  );

  return (
    <div className="rounded-[12px] border border-[var(--a-line)] bg-[var(--a-surface-2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[var(--a-text)]">
            🔔 Push obavijesti
            {state === "on" && badge("Uključeno", "good")}
            {state === "off" && badge("Isključeno", "warn")}
            {state === "denied" && badge("Blokirano", "bad")}
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--a-text-2)]">Obavijest na ovaj uređaj kad stigne nova narudžba.</p>
        </div>
        {(state === "off" || state === "working") && (
          <button type="button" onClick={enable} disabled={state === "working"} className="a-btn a-btn-primary shrink-0 disabled:opacity-50">
            {state === "working" ? "…" : "Uključi"}
          </button>
        )}
        {state === "on" && (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={test} className="a-btn a-btn-sm">Test</button>
            <button type="button" onClick={disable} className="a-btn a-btn-sm">Isključi</button>
          </div>
        )}
      </div>

      {state === "ios-install" && (
        <p className="mt-2 rounded-[10px] bg-[var(--a-info-bg)] px-3 py-2 text-[12px] text-[var(--a-info)]">
          📲 Na iPhoneu: otvori u Safariju → <b>Podijeli</b> → <b>„Dodaj na početni zaslon”</b>, pa aplikaciju otvori s
          početnog zaslona i ovdje uključi obavijesti. (Appleovo pravilo, iOS 16.4+.)
        </p>
      )}
      {state === "not-configured" && (
        <p className="mt-2 rounded-[10px] bg-[var(--a-warn-bg)] px-3 py-2 text-[12px] text-[var(--a-warn)]">
          Push još nije konfiguriran — treba postaviti VAPID ključeve u Vercelu (<code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>).
        </p>
      )}
      {state === "unsupported" && (
        <p className="mt-2 text-[12px] text-[var(--a-text-3)]">Ovaj preglednik ne podržava push obavijesti.</p>
      )}
      {state === "denied" && (
        <p className="mt-2 rounded-[10px] bg-[var(--a-bad-bg)] px-3 py-2 text-[12px] text-[var(--a-bad)]">
          Obavijesti su blokirane u postavkama preglednika — uključi ih ručno za ovu stranicu pa osvježi.
        </p>
      )}
      {msg && <p className="mt-2 text-[12px] text-[var(--a-text-2)]">{msg}</p>}
    </div>
  );
}
