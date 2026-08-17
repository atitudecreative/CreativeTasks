// Constante pura, sem import nenhum de servidor (next/headers etc.) —
// separada de src/lib/data/deliverables.ts de propósito, pra componentes
// "use client" (DeliverableCard, NewDeliverableForm) poderem importar só
// isso sem puxar as funções de busca (que usam createClient/next/headers)
// pro bundle do navegador. Mesmo padrão já usado em demandOptions.ts.
export const DELIVERABLE_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  para_aprovacao: "Para aprovação",
  aprovado: "Aprovado",
  final: "Final",
  arquivado: "Arquivado",
};
