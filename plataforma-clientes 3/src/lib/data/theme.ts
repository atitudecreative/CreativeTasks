import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  BRAND_SHADES,
  WALNUT_SHADES,
  generateScaleRgbTriplets,
  DEFAULT_BRAND_COLOR,
  DEFAULT_WALNUT_COLOR,
} from "@/lib/theme";

export type SiteTheme = {
  brandColor: string;
  walnutColor: string;
};

// cache() por request: o layout raiz lê isso em toda página (inclusive
// login, sem sessão) — não precisa buscar de novo se algo mais no mesmo
// request já pediu.
export const getSiteTheme = cache(async (): Promise<SiteTheme> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_theme")
    .select("brand_color, walnut_color")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    return { brandColor: DEFAULT_BRAND_COLOR, walnutColor: DEFAULT_WALNUT_COLOR };
  }

  return { brandColor: data.brand_color, walnutColor: data.walnut_color };
});

// String pronta pra injetar como `style` no <html> — define as variáveis
// CSS que o tailwind.config.ts referencia pras paletas brand/walnut.
export function buildThemeCssVars(theme: SiteTheme): Record<string, string> {
  const brand = generateScaleRgbTriplets(theme.brandColor, BRAND_SHADES);
  const walnut = generateScaleRgbTriplets(theme.walnutColor, WALNUT_SHADES);

  const vars: Record<string, string> = {};
  for (const shade of BRAND_SHADES) vars[`--brand-${shade}`] = brand[shade];
  for (const shade of WALNUT_SHADES) vars[`--walnut-${shade}`] = walnut[shade];
  return vars;
}
