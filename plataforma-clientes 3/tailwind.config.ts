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
        // Valores vêm de variáveis CSS (--brand-50..900), definidas em
        // tempo real pelo layout raiz a partir do que está salvo em
        // site_theme (ver src/lib/data/theme.ts e src/lib/theme.ts) — é
        // isso que permite a Comunicação trocar a cor principal do site
        // inteiro em /dashboard/admin/aparencia sem precisar de novo
        // deploy. `<alpha-value>` mantém classes tipo bg-brand-50/40
        // funcionando normalmente.
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
          800: "rgb(var(--brand-800) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
        },

        // Marrom — cor secundária: sidebar, blocos de destaque escuros,
        // textos de apoio com mais peso. Mesma ideia: vem de variável CSS.
        walnut: {
          50: "rgb(var(--walnut-50) / <alpha-value>)",
          100: "rgb(var(--walnut-100) / <alpha-value>)",
          200: "rgb(var(--walnut-200) / <alpha-value>)",
          300: "rgb(var(--walnut-300) / <alpha-value>)",
          400: "rgb(var(--walnut-400) / <alpha-value>)",
          500: "rgb(var(--walnut-500) / <alpha-value>)",
          600: "rgb(var(--walnut-600) / <alpha-value>)",
          700: "rgb(var(--walnut-700) / <alpha-value>)",
          800: "rgb(var(--walnut-800) / <alpha-value>)",
          900: "rgb(var(--walnut-900) / <alpha-value>)",
          950: "rgb(var(--walnut-950) / <alpha-value>)",
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
