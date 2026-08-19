import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveMinistrySafe } from "./ministries";
import {
  BRAND_SHADES,
  WALNUT_SHADES,
  generateScaleRgbTriplets,
  DEFAULT_BRAND_COLOR,
  DEFAULT_WALNUT_COLOR,
} from "@/lib/theme";

export type SiteTheme = { brandColor: string; walnutColor: string; logoUrl: string | null };

// Tema padrão do site: usado na tela de login (sem usuário logado, sem
// ministério ativo) e como fallback pra qualquer ministério que ainda
// não tenha cor própria definida.
export const getSiteTheme = cache(async (): Promise<SiteTheme> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_theme")
    .select("brand_color, walnut_color, logo_url")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    return { brandColor: DEFAULT_BRAND_COLOR, walnutColor: DEFAULT_WALNUT_COLOR, logoUrl: null };
  }
  return { brandColor: data.brand_color, walnutColor: data.walnut_color, logoUrl: data.logo_url ?? null };
});

// Tema "efetivo" pra renderizar em qualquer página: cor do ministério
// ativo (definida pela Comunicação em /dashboard/admin/ministerios/[id]),
// com fallback pra cor padrão do site campo a campo (dá pra um ministério
// ter customizado só a principal e deixar a secundária no padrão, por
// exemplo). Sem usuário logado ou sem ministério ativo (tela de login,
// Comunicação sem nenhum ministério cadastrado), sempre o padrão do site
// — é essa a função que o layout raiz chama.
export const getEffectiveTheme = cache(async (): Promise<SiteTheme> => {
  const site = await getSiteTheme();
  const ministry = await getActiveMinistrySafe();

  return {
    brandColor: ministry?.brand_color ?? site.brandColor,
    walnutColor: ministry?.walnut_color ?? site.walnutColor,
    // Logo não é por ministério — é uma identidade de marca única
    // (definida em /dashboard/admin/marca), sempre a do site.
    logoUrl: site.logoUrl,
  };
});

export function buildThemeCssVars(theme: SiteTheme): Record<string, string> {
  const brand = generateScaleRgbTriplets(theme.brandColor, BRAND_SHADES);
  const walnut = generateScaleRgbTriplets(theme.walnutColor, WALNUT_SHADES);

  const vars: Record<string, string> = {};
  for (const shade of BRAND_SHADES) vars[`--brand-${shade}`] = brand[shade];
  for (const shade of WALNUT_SHADES) vars[`--walnut-${shade}`] = walnut[shade];
  return vars;
}
