import { redirect } from "next/navigation";

// A logo do site virou de novo um arquivo fixo — a "capa" (imagem de
// fundo) agora é por ministério, configurada na tela de edição de cada
// um (/dashboard/admin/ministerios/[id]). Só redireciona quem tinha essa
// página salva/linkada.
export default function AdminMarcaRedirect() {
  redirect("/dashboard/admin/ministerios");
}
