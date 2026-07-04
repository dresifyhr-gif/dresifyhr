"use client";

import { useEffect } from "react";

// Triggers the browser print dialog once the packing slip has rendered.
// Also exposes a manual button for reprints.
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      Isprintaj ponovno
    </button>
  );
}
