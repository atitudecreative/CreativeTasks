import { redirect } from "next/navigation";

// Renomeado pra "Meu acesso" (nomenclatura do PRD, seção 7.1).
export default function ConfiguracoesRedirectPage() {
  redirect("/dashboard/acesso");
}
