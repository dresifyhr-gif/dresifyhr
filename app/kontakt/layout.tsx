import type { ReactNode } from "react";

import { buildMetadata } from "@/lib/seo";

// page.tsx je klijentska komponenta ("use client") pa ne može izvesti metadata —
// bez ovog layouta /kontakt/ je nasljeđivao naslov naslovnice.
export const metadata = buildMetadata({
  title: "Kontakt — WhatsApp, Instagram, telefon",
  description:
    "Javi se Dresifyju na WhatsApp, Instagram ili telefon — odgovaramo brzo. Narudžbe pouzećem, dostava 2–5 dana po Hrvatskoj.",
  path: "/kontakt"
});

export default function KontaktLayout({ children }: { children: ReactNode }) {
  return children;
}
