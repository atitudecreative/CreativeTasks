import { redirect } from "next/navigation";

// Aparência agora se edita por ministério, dentro da tela de edição em
// Ministérios (cadastro) — não existe mais uma tela de aparência
// separada. Só redireciona quem tinha essa página salva/linkada.
export default function AdminAparenciaRedirect() {
  redirect("/dashboard/admin/ministerios");
}
