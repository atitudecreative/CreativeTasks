import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  BRAND_SHADES,
  WALNUT_SHADES,
  generateScaleRgbTriplets,
  DEFAULT_BRAND_COLOR,
  DEFAULT_WALNUT_COLOR,
} from "@/lib/theme";

export type SiteTheme = { brandColor: string; walnutColor: string };

// Cor "própria" do usuário logado — cada campo fica null se a pessoa
// nunca escolheu uma cor pessoal (aí vale o padrão do site).
export type UserThemeOverride = { brandColor: string | null; walnutColor: string | null };

// Tema padrão do site: usado na tela de login (sem usuário logado) e
// como fallback pra quem nunca escolheu uma cor própria.
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

// Cor pessoal do usuário logado (colunas em profiles), sem aplicar
// fallback nenhum — usado na tela de Aparência pra saber se a pessoa já
// customizou algo ou não.
export const getMyThemeOverride = cache(async (): Promise<UserThemeOverride> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { brandColor: null, walnutColor: null };

  const { data } = await supabase
    .from("profiles")
    .select("brand_color, walnut_color")
    .eq("id", user.id)
    .maybeSingle();

  return {
    brandColor: data?.brand_color ?? null,
    walnutColor: data?.walnut_color ?? null,
  };
});

// Tema "efetivo" pra renderizar em qualquer página: cor pessoal do
// usuário logado, com fallback pra cor padrão do site campo a campo (dá
// pra ter customizado só a principal e deixar a secundária no padrão,
// por exemplo). Sem usuário logado (tela de login), sempre o padrão do
// site — é essa a função que o layout raiz chama.
export const getEffectiveTheme = cache(async (): Promise<SiteTheme> => {
  const site = await getSiteTheme();
  const override = await getMyThemeOverride();

  return {
    brandColor: override.brandColor ?? site.brandColor,
    walnutColor: override.walnutColor ?? site.walnutColor,
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
