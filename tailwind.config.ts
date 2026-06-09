import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFAF8",
        surface: "#FFFFFF",
        border: "#E8E8E4",
        ink: "#1A1A1A",
        muted: "#6B6B6B",
        accent: "#5B7C6B",
        "accent-light": "#E8F0EB",
        extra: "#B8860B",
        "extra-light": "#FDF6E8",
      },
    },
  },
  plugins: [],
};

export default config;
