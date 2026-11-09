import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        accent: "#e8ff3c",
        surface: "#111111",
        muted: "rgba(255,255,255,0.5)",
        line: "rgba(255, 255, 255, 0.08)",
        // Koncept A "Matchday Drop" — tamne plohe, topli bijeli tekst, volt akcent.
        ink: "#0a0a0a",
        ink2: "#131313",
        ink3: "#1c1c1c",
        fg: "#f4f4ef",
        mute: "#8d8d86",
        mute2: "#5e5e59",
        soft: "#a3a3a3",
        volt: "#e8ff3c",
        hr: "#e3122b"
      },
      fontFamily: {
        heading: ["var(--font-anton)", "Impact", "Arial Narrow", "sans-serif"],
        display: ["var(--font-anton)", "Impact", "Arial Narrow", "sans-serif"],
        body: ["var(--font-archivo)", "Helvetica Neue", "Arial", "sans-serif"]
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(232, 255, 60, 0.22), 0 18px 46px rgba(0, 0, 0, 0.42)"
      },
      backgroundImage: {
        "hero-stripes":
          "repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 18px)"
      }
    }
  },
  plugins: []
};

export default config;
