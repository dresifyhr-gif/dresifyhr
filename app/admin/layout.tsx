import type { Metadata, Viewport } from "next";

// PWA metapodaci vezani SAMO uz /admin (kupci na dućanu ne vide "instaliraj admin").
export const metadata: Metadata = {
  title: "Dresify Admin",
  manifest: "/admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Dresify",
    statusBarStyle: "black-translucent"
  },
  icons: {
    apple: "/icons/apple-touch-icon.png"
  },
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a"
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
