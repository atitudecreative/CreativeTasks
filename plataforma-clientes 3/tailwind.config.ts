import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

/** Açúcar pra token semântico: `rgb(var(--x) / <alpha-value>)` mantém
 *  opacidade funcionando (bg-surface/60, border-line/50 etc.). */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  // Dark mode por atributo (não por classe, não por media query): o
  // <html data-theme="dark"> é escrito pelo script anti-flash no layout
  // raiz e trocado pelo toggle do header. A maior parte do produto nem
  // usa prefixo `dark:` — os tokens semânticos abaixo já resolvem
  // sozinhos. O prefixo fica pra exceção pontual.
  darkMode: ["variant", '&:where([data-theme="dark"], [data-theme="dark"] *)'],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cinza neutro do app inteiro é um cinza quente (stone), que
        // combina com a base creme/âmbar em vez do cinza frio padrão.
        // Mantido pra não quebrar o que ainda usa neutral-* direto.
        neutral: colors.stone,

        // ---------------------------------------------------------------
        // MARCA (runtime) — vem do banco. Ver src/lib/data/theme.ts:
        // o layout raiz injeta --brand-50..900 e --walnut-50..950 no
        // <html> a partir do que a Comunicação salvou em site_theme, e é
        // isso que permite repintar o produto sem novo deploy.
        // ---------------------------------------------------------------
        brand: {
          50: token("brand-50"),
          100: token("brand-100"),
          200: token("brand-200"),
          300: token("brand-300"),
          400: token("brand-400"),
          500: token("brand-500"),
          600: token("brand-600"),
          700: token("brand-700"),
          800: token("brand-800"),
          900: token("brand-900"),
        },
        walnut: {
          50: token("walnut-50"),
          100: token("walnut-100"),
          200: token("walnut-200"),
          300: token("walnut-300"),
          400: token("walnut-400"),
          500: token("walnut-500"),
          600: token("walnut-600"),
          700: token("walnut-700"),
          800: token("walnut-800"),
          900: token("walnut-900"),
          950: token("walnut-950"),
        },
        cream: { 50: "#fdf8f0", 100: "#faf0dd", 200: "#f3e1bd" },

        // ---------------------------------------------------------------
        // TOKENS SEMÂNTICOS — definidos em globals.css, com valor próprio
        // no claro e no escuro. É o vocabulário que as telas usam.
        // ---------------------------------------------------------------
        canvas: {
          DEFAULT: token("canvas"),
          sunken: token("canvas-sunken"),
        },
        surface: {
          DEFAULT: token("surface"),
          raised: token("surface-raised"),
          sunken: token("surface-sunken"),
          inverse: token("surface-inverse"),
        },
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
          inverse: token("line-inverse"),
        },
        ink: {
          DEFAULT: token("ink"),
          2: token("ink-2"),
          3: token("ink-3"),
          inverse: token("ink-inverse"),
          onAccent: token("ink-on-accent"),
        },
        success: {
          DEFAULT: token("success"),
          soft: token("success-soft"),
          line: token("success-line"),
        },
        warning: {
          DEFAULT: token("warning"),
          soft: token("warning-soft"),
          line: token("warning-line"),
        },
        danger: {
          DEFAULT: token("danger"),
          soft: token("danger-soft"),
          line: token("danger-line"),
        },
        info: {
          DEFAULT: token("info"),
          soft: token("info-soft"),
          line: token("info-line"),
        },
        "neutral-soft": token("neutral-soft"),
        chart: {
          1: token("chart-1"),
          2: token("chart-2"),
          3: token("chart-3"),
          4: token("chart-4"),
          5: token("chart-5"),
          6: token("chart-6"),
          7: token("chart-7"),
          8: token("chart-8"),
        },
      },

      fontFamily: {
        // Inter pra tudo que é interface e texto corrido.
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        // IBM Plex Mono pra rótulo, eyebrow, identificador (DEM-2026-...),
        // eixo de gráfico e número em tabela. Não é enfeite: alinha dígito
        // com dígito e dá o contraste "editorial x instrumento" que separa
        // rótulo de dado sem precisar de mais uma cor.
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      // Escala tipográfica fechada — cada degrau já carrega line-height,
      // tracking e peso. Evita a bagunça de `text-4xl` numa tela e
      // `text-lg` na outra pro mesmo nível de hierarquia.
      fontSize: {
        display: ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.035em", fontWeight: "700" }],
        "display-sm": ["2rem", { lineHeight: "2.25rem", letterSpacing: "-0.03em", fontWeight: "700" }],
        h1: ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.025em", fontWeight: "650" }],
        h2: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.018em", fontWeight: "600" }],
        h3: ["1rem", { lineHeight: "1.5rem", letterSpacing: "-0.012em", fontWeight: "600" }],
        h4: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "-0.006em", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.375rem", letterSpacing: "-0.003em" }],
        "body-lg": ["1rem", { lineHeight: "1.625rem", letterSpacing: "-0.005em" }],
        small: ["0.8125rem", { lineHeight: "1.25rem" }],
        caption: ["0.75rem", { lineHeight: "1rem" }],
        // Eyebrow/label: mono, caixa alta, entreletra aberta.
        label: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em", fontWeight: "500" }],
        // Números de KPI — três tamanhos, todos com tracking fechado.
        metric: ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.03em", fontWeight: "650" }],
        "metric-lg": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.035em", fontWeight: "700" }],
        "metric-sm": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.025em", fontWeight: "650" }],
      },

      fontWeight: { 450: "450", 550: "550", 650: "650" },

      // Escala de espaço base 4 — os degraus nomeados cobrem o ritmo de
      // layout (gutter de página, respiro entre seções, altura de controle).
      spacing: {
        "control-sm": "2rem",     /* 32 */
        control: "2.25rem",       /* 36 */
        "control-lg": "2.5rem",   /* 40 */
        touch: "2.75rem",         /* 44 — alvo mínimo de toque */
        gutter: "1.25rem",
        "gutter-lg": "2rem",
        section: "2rem",
        "section-lg": "2.5rem",
        18: "4.5rem",
        22: "5.5rem",
        sidebar: "16.5rem",
        "sidebar-collapsed": "4.25rem",
        header: "3.5rem",
      },

      borderRadius: {
        // Um raio por papel, não um por gosto: controle (8), card (12),
        // painel/superfície grande (16), diálogo (20).
        control: "0.5rem",
        card: "0.75rem",
        panel: "1rem",
        dialog: "1.25rem",
      },

      // Elevação de verdade: sombras em camadas, coloridas com o tom da
      // tinta (não preto puro), pra card / dropdown / modal não terem
      // todos o mesmo peso.
      boxShadow: {
        none: "none",
        line: "0 0 0 1px rgb(var(--line))",
        xs: "0 1px 2px -1px rgb(var(--shadow-color) / 0.08), 0 1px 1px rgb(var(--shadow-color) / 0.04)",
        sm: "0 1px 3px rgb(var(--shadow-color) / 0.07), 0 1px 2px -1px rgb(var(--shadow-color) / 0.05)",
        md: "0 4px 10px -2px rgb(var(--shadow-color) / 0.09), 0 2px 4px -2px rgb(var(--shadow-color) / 0.05)",
        lg: "0 12px 24px -6px rgb(var(--shadow-color) / 0.13), 0 4px 8px -4px rgb(var(--shadow-color) / 0.07)",
        xl: "0 24px 48px -12px rgb(var(--shadow-color) / 0.2), 0 8px 16px -8px rgb(var(--shadow-color) / 0.1)",
        dialog: "0 32px 64px -16px rgb(var(--shadow-color) / 0.28), 0 0 0 1px rgb(var(--line))",
        focus: "0 0 0 2px rgb(var(--surface)), 0 0 0 4px rgb(var(--brand-500) / 0.85)",
      },

      // Curvas: `signal` (expo-out) pra entrada de conteúdo, `snap` pra
      // reação de controle (hover/press) — curta e sem overshoot.
      transitionTimingFunction: {
        signal: "cubic-bezier(0.22, 1, 0.36, 1)",
        snap: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: { 120: "120ms", 180: "180ms", 240: "240ms", 420: "420ms" },

      animation: {
        "fade-in": "signal-fade-in 0.24s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "signal-fade-up 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "signal-scale-in 0.18s cubic-bezier(0.32, 0.72, 0, 1) both",
        "slide-left": "signal-slide-left 0.28s cubic-bezier(0.32, 0.72, 0, 1) both",
        "slide-up": "signal-slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
        "bar-grow": "signal-bar-grow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        spin: "signal-spin 0.7s linear infinite",
      },

      zIndex: { header: "30", sidebar: "40", overlay: "50", dialog: "60", toast: "70" },

      maxWidth: { content: "88rem", prose: "42rem", report: "72rem" },
    },
  },
  plugins: [],
};

export default config;
