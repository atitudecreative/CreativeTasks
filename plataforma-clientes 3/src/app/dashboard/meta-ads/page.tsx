import { redirect } from "next/navigation";

// Investimentos e mídia paga são Fase 2 do PRD (seção 8.7) — ainda
// não têm tela própria. Redireciona pro Início até lá.
export default function MetaAdsRedirectPage() {
  redirect("/dashboard");
}
