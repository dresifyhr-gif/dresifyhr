// Thin wrapper around the Meta Pixel global (window.fbq).
// Safe to call anywhere — no-ops if the pixel hasn't loaded.

type FbqParams = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function fbTrack(event: string, params?: FbqParams, eventID?: string) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    // eventID omogućuje deduplikaciju s server-side CAPI eventom (isti id → Meta broji jednom).
    if (eventID) window.fbq("track", event, params, { eventID });
    else window.fbq("track", event, params);
  }
}

// Pročitaj cookie (npr. _fbc) na klijentu — šaljemo ga serveru za bolji CAPI match.
export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie.match(new RegExp(`${name}=([^;]+)`))?.[1];
}
