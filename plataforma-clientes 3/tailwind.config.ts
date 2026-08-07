import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f0ff",
          100: "#e6e2ff",
          500: "#6d5cf6",
          600: "#5a48e0",
          700: "#4736b8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
