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
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        surface: "#111111",
        muted: "rgba(255,255,255,0.5)",
        line: "rgba(255, 255, 255, 0.08)"
      },
      fontFamily: {
        heading: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-barlow)", "sans-serif"]
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
