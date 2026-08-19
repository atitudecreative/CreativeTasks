import { redirect } from "next/navigation";

// Aparência deixou de ser preferência pessoal por usuário — agora é a
// Comunicação quem define a cor de cada ministério, em
// /dashboard/admin/ministerios/[id]. Só redireciona quem tinha essa
// página salva/linkada.
export default function AparenciaRedirect() {
  redirect("/dashboard");
}
