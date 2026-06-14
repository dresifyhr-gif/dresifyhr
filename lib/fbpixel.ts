// Thin wrapper around the Meta Pixel global (window.fbq).
// Safe to call anywhere — no-ops if the pixel hasn't loaded.

type FbqParams = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function fbTrack(event: string, params?: FbqParams) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", event, params);
  }
}
