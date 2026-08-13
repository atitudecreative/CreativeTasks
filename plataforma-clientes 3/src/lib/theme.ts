// Geração da paleta de cores do site a partir de UMA cor escolhida pelo
// usuário (a "cor principal" ou "cor secundária"). Arquivo sem dependência
// de servidor — importável de Server e Client Components sem risco de
// quebrar o build.
//
// Por que não deixar o usuário escolher cada tom (50 a 900) na mão: ele
// erraria contraste sem querer (texto ilegível, botão sumindo no fundo).
// Em vez disso, a gente pega só o matiz (hue) e a saturação da cor
// escolhida, e aplica uma curva de luminosidade FIXA e testada pra cada
// degrau — isso garante que o degrau 50 sempre fica bem claro (serve de
// fundo com texto escuro em cima) e o 900 sempre fica bem escuro (serve de
// texto sobre fundo claro), não importa qual matiz a pessoa escolheu.

export type ShadeKey = "50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "950";

export const BRAND_SHADES: ShadeKey[] = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
export const WALNUT_SHADES: ShadeKey[] = [...BRAND_SHADES, "950"];

// Curva de luminosidade (%) por degrau — a mesma pra qualquer matiz, é o
// que garante leitura consistente. Calibrada pra ficar parecida com a
// distribuição que o Tailwind usa nas paletas dele.
const LIGHTNESS_CURVE: Record<ShadeKey, number> = {
  "50": 96,
  "100": 91,
  "200": 80,
  "300": 65,
  "400": 52,
  "500": 43,
  "600": 36,
  "700": 29,
  "800": 23,
  "900": 18,
  "950": 11,
};

// Satura entre esses limites — cor quase cinza (saturação baixa) vira uma
// paleta "morta"; cor neon (saturação muito alta) fica cansativa em telas
// grandes de UI. Isso é aplicado só pra gerar a escala; a cor 500 exibida
// no seletor continua sendo a cor que a pessoa escolheu.
const MIN_SATURATION = 28;
const MAX_SATURATION = 82;

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
      break;
    case gn:
      h = ((bn - rn) / d + 2) * 60;
      break;
    default:
      h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

// Gera a escala completa (hex por degrau) a partir de uma cor base.
export function generateScale(baseHex: string, shades: ShadeKey[]): Record<ShadeKey, string> {
  const rgb = hexToRgb(baseHex);
  const fallback = hexToRgb("#f3701c")!;
  const { r, g, b } = rgb ?? fallback;
  const { h, s } = rgbToHsl(r, g, b);
  const clampedS = Math.max(MIN_SATURATION, Math.min(MAX_SATURATION, s));

  const result = {} as Record<ShadeKey, string>;
  for (const shade of shades) {
    const l = LIGHTNESS_CURVE[shade];
    const { r: rr, g: gg, b: bb } = hslToRgb(h, clampedS, l);
    result[shade] = rgbToHex(rr, gg, bb);
  }
  return result;
}

// Mesma escala, mas como "R G B" (triplet espaço-separado) — formato que o
// Tailwind espera quando a cor é definida como `rgb(var(--x) / <alpha-value>)`
// no tailwind.config.ts, pra opacidade (ex: bg-brand-50/40) continuar funcionando.
export function generateScaleRgbTriplets(baseHex: string, shades: ShadeKey[]): Record<ShadeKey, string> {
  const hexScale = generateScale(baseHex, shades);
  const result = {} as Record<ShadeKey, string>;
  for (const shade of shades) {
    const rgb = hexToRgb(hexScale[shade])!;
    result[shade] = `${rgb.r} ${rgb.g} ${rgb.b}`;
  }
  return result;
}

export function isValidHex(value: string): boolean {
  return hexToRgb(value) !== null;
}

// Avisa na UI quando a cor escolhida tem saturação muito baixa (quase
// cinza) — a paleta gerada ainda vai funcionar (a curva de luminosidade
// garante isso), mas o resultado pode não parecer muito "colorido".
export function isLowSaturation(baseHex: string): boolean {
  const rgb = hexToRgb(baseHex);
  if (!rgb) return false;
  const { s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return s < MIN_SATURATION;
}

export const DEFAULT_BRAND_COLOR = "#f3701c";
export const DEFAULT_WALNUT_COLOR = "#87603f";
