// Opções/labels de status e prioridade de demanda — arquivo sem
// dependência de servidor (sem Supabase, sem next/headers), pra poder ser
// importado tanto de Server Components quanto de Client Components sem
// risco de quebrar o build.
export const STATUS_OPTIONS = [
  { value: "recebida", label: "Recebida" },
  { value: "em_triagem", label: "Em triagem" },
  { value: "aguardando_briefing", label: "Aguardando briefing" },
  { value: "planejada", label: "Planejada" },
  { value: "em_producao", label: "Em produção" },
  { value: "em_revisao_interna", label: "Em revisão interna" },
  { value: "aguardando_ministerio", label: "Aguardando ministério" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "ajustes_solicitados", label: "Ajustes solicitados" },
  { value: "aprovada", label: "Aprovada" },
  { value: "agendada_ou_publicada", label: "Agendada ou publicada" },
  { value: "concluida", label: "Concluída" },
  { value: "pausada", label: "Pausada" },
  { value: "cancelada", label: "Cancelada" },
];

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
);

export const PRIORIDADE_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export const PRIORIDADE_LABEL: Record<string, string> = Object.fromEntries(
  PRIORIDADE_OPTIONS.map((p) => [p.value, p.label])
);
