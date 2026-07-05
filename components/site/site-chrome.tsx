"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Wraps the marketing-site chrome (navbar, footer, cart, chat, popups). On /admin
// it renders NONE of it — the admin is a standalone app with its own layout.
export function SiteChrome({
  header,
  footer,
  children
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen">
      {header}
      <main>{children}</main>
      {footer}
    </div>
  );
}
