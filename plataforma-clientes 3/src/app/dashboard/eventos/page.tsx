import { redirect } from "next/navigation";

// "Evento" agora é um tipo de campanha (PRD 8.5) em vez de uma
// fonte de dados separada — redireciona pra lista de campanhas.
export default function EventosRedirectPage() {
  redirect("/dashboard/campanhas");
}
