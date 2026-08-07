import { redirect } from "next/navigation";

// A partir da Fase 1 do PRD, tarefas do Asana viram "demandas" —
// essa rota antiga só redireciona pra não quebrar links salvos.
export default function AsanaRedirectPage() {
  redirect("/dashboard/demandas");
}
