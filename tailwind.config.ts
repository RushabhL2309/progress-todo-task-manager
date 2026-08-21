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
        canvas: "rgb(var(--rgb-canvas) / <alpha-value>)",
        surface: "rgb(var(--rgb-surface) / <alpha-value>)",
        border: "rgb(var(--rgb-border) / <alpha-value>)",
        ink: "rgb(var(--rgb-ink) / <alpha-value>)",
        muted: "rgb(var(--rgb-muted) / <alpha-value>)",
        accent: "rgb(var(--rgb-accent) / <alpha-value>)",
        "accent-light": "rgb(var(--rgb-accent-light) / <alpha-value>)",
        extra: "rgb(var(--rgb-extra) / <alpha-value>)",
        "extra-light": "rgb(var(--rgb-extra-light) / <alpha-value>)",
      },
      boxShadow: {
        glow: "0 0 24px var(--color-glow)",
        "card-dark": "0 8px 32px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
