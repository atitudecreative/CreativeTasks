// Opções/labels de campanha — arquivo sem dependência de servidor (sem
// Supabase, sem next/headers), pra poder ser importado tanto de Server
// Components quanto de Client Components (ex: formulário de edição de
// campanha) sem risco de quebrar o build.
export const TIPO_OPTIONS = [
  { value: "campanha", label: "Campanha" },
  { value: "evento", label: "Evento" },
  { value: "lancamento", label: "Lançamento" },
  { value: "serie", label: "Série" },
  { value: "acao_recorrente", label: "Ação recorrente" },
  { value: "projeto_institucional", label: "Projeto institucional" },
];

export const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPO_OPTIONS.map((t) => [t.value, t.label])
);

export const FASE_OPTIONS = [
  { value: "descoberta_briefing", label: "Descoberta e briefing" },
  { value: "planejamento", label: "Planejamento" },
  { value: "criacao", label: "Criação" },
  { value: "producao", label: "Produção" },
  { value: "aprovacao", label: "Aprovação" },
  { value: "distribuicao_execucao", label: "Distribuição ou execução" },
  { value: "monitoramento", label: "Monitoramento" },
  { value: "encerramento_aprendizado", label: "Encerramento e aprendizado" },
];

export const FASE_LABEL: Record<string, string> = Object.fromEntries(
  FASE_OPTIONS.map((f) => [f.value, f.label])
);

export const SAUDE_OPTIONS = [
  { value: "no_caminho", label: "No caminho" },
  { value: "atencao", label: "Atenção" },
  { value: "critica", label: "Crítica" },
  { value: "pausada", label: "Pausada" },
  { value: "concluida", label: "Concluída" },
];

export const SAUDE_LABEL: Record<string, string> = Object.fromEntries(
  SAUDE_OPTIONS.map((s) => [s.value, s.label])
);

// Hex pros gráficos (recharts pinta via `fill`, não aceita classe Tailwind).
export const SAUDE_COLOR_HEX: Record<string, string> = {
  no_caminho: "#4ade80",
  atencao: "#fbbf24",
  critica: "#f87171",
  pausada: "#a8a29e",
  concluida: "#38bdf8",
};
