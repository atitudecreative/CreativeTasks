import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cinza neutro do app inteiro passa a ser um cinza quente (stone),
        // que combina com a base creme em vez do cinza frio padrão.
        neutral: colors.stone,

        // Laranja forte — cor primária: botões, links, estados ativos, foco.
        brand: {
          50: "#fff4ec",
          100: "#ffe4cc",
          200: "#ffc899",
          300: "#ffa35c",
          400: "#fb8332",
          500: "#f3701c",
          600: "#dd5b0f",
          700: "#b6470c",
          800: "#8f380f",
          900: "#742f10",
        },

        // Marrom — cor secundária: sidebar, blocos de destaque escuros,
        // textos de apoio com mais peso.
        walnut: {
          50: "#faf6f2",
          100: "#f0e5d8",
          200: "#ddc4a8",
          300: "#c19d76",
          400: "#a67b54",
          500: "#87603f",
          600: "#6b4a30",
          700: "#523827",
          800: "#3a271b",
          900: "#271a13",
          950: "#180F0A",
        },

        // Creme — base do app (fundo de página).
        cream: {
          50: "#fdf8f0",
          100: "#faf0dd",
          200: "#f3e1bd",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
