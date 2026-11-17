import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0C10",
        surface: {
          50: "#1A1E29",
          100: "#161A24",
          200: "#12151E",
          300: "#0E1118",
          400: "#0A0C10",
        },
        panel: {
          DEFAULT: "#12151E",
          card: "#161A24",
          subtle: "#1C212E",
          border: "#23293A",
          hover: "#283044",
        },
        brand: {
          purple: "#9333EA",
          "purple-light": "#A855F7",
          blue: "#2563EB",
          "blue-light": "#38BDF8",
          cyan: "#06B6D4",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        "glow-purple": "0 0 25px -5px rgba(168, 85, 247, 0.3)",
        "glow-blue": "0 0 25px -5px rgba(56, 189, 248, 0.3)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
