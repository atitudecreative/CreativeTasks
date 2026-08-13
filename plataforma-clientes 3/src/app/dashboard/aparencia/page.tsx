import { requireMinistry } from "@/lib/data/ministries";
import { getMyThemeOverride, getSiteTheme } from "@/lib/data/theme";
import { ThemeSettingsForm } from "./ThemeSettingsForm";

// Qualquer usuário autenticado (não só Comunicação) chega aqui — cada
// pessoa escolhe a própria cor. Por isso `requireMinistry`, não
// `requireComunicacao`: só precisa estar logado e ter algum acesso.
export default async function AparenciaPage() {
  await requireMinistry();

  const [override, site] = await Promise.all([getMyThemeOverride(), getSiteTheme()]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Aparência</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Essa é a sua preferência pessoal — só muda como o site aparece pra você. Cor principal e
        cor secundária usadas na sua sessão (menu, botões, badges, gráficos). As tonalidades
        claras e escuras de cada cor são geradas automaticamente pra manter o contraste — não
        precisa se preocupar com legibilidade.
      </p>

      <ThemeSettingsForm
        initialBrand={override.brandColor ?? site.brandColor}
        initialWalnut={override.walnutColor ?? site.walnutColor}
        siteBrand={site.brandColor}
        siteWalnut={site.walnutColor}
        hasCustom={Boolean(override.brandColor || override.walnutColor)}
      />
    </div>
  );
}
