import { requireComunicacao } from "@/lib/data/ministries";
import { getSiteTheme } from "@/lib/data/theme";
import { ThemeSettingsForm } from "./ThemeSettingsForm";

export default async function AparenciaPage() {
  await requireComunicacao();
  const theme = await getSiteTheme();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Aparência</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Cor principal e cor secundária usadas no site inteiro (sidebar, botões, badges,
        gráficos). A tela de login também usa essas cores. As tonalidades claras e escuras de
        cada cor são geradas automaticamente pra manter o contraste — não precisa se preocupar
        com legibilidade.
      </p>

      <ThemeSettingsForm initialBrand={theme.brandColor} initialWalnut={theme.walnutColor} />
    </div>
  );
}
