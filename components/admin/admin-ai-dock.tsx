"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { AdminAiChat } from "@/components/admin/ai-chat";

// Floating "Dresify AI" assistant available on every admin page.
export function AdminAiDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-slate-900 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 lg:bottom-6 lg:right-6"
        >
          <Image src="/dresify-robot.png" alt="Dresify AI" width={48} height={48} className="h-12 w-12 object-contain" />
          Dresify AI
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Zatvori" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-slate-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Image src="/dresify-robot.png" alt="Dresify AI" width={40} height={40} className="h-10 w-10 object-contain" />
                <span className="text-sm font-bold text-slate-900">Dresify AI</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 transition hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <AdminAiChat fill />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
