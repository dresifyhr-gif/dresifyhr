"use client";

import { useEffect, useState } from "react";

// Link na 100×150 mm PDF za MarkLife app. Poštuje odabranog pošiljatelja (localStorage).
export function PdfLabelLink({ id, defaultSender }: { id: string; defaultSender?: "igor" | "ivica" }) {
  const [sender, setSender] = useState<"igor" | "ivica" | undefined>(defaultSender);

  useEffect(() => {
    if (defaultSender) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem("dresify-sender") : null;
    if (saved === "igor" || saved === "ivica") setSender(saved);
  }, [defaultSender]);

  const href = `/admin/print/${id}/pdf/${sender ? `?sender=${sender}` : ""}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-[10px] bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-600"
    >
      📄 PDF za MarkLife
    </a>
  );
}
