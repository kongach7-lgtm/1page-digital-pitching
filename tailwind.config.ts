import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#1A1A2E",
          accent: "#FF6B35",
          badge: "#FFD93D",
        },
      },
      fontFamily: {
        sans: ["var(--font-kanit)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
