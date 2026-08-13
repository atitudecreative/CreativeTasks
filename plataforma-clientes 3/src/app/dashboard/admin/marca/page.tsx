import { requireComunicacao } from "@/lib/data/ministries";
import { getSiteTheme } from "@/lib/data/theme";
import { LogoUploadForm } from "./LogoUploadForm";

export default async function MarcaPage() {
  await requireComunicacao();
  const theme = await getSiteTheme();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Marca do site</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Logo usada no menu lateral e na tela de login — vale pra todo mundo que acessa o portal
        (diferente da cor, que agora cada usuário escolhe a própria em Aparência).
      </p>

      <LogoUploadForm currentLogoUrl={theme.logoUrl} />
    </div>
  );
}
