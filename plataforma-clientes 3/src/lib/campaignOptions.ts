// Opções/labels de tipo de campanha — arquivo sem dependência de servidor
// (sem Supabase, sem next/headers), pra poder ser importado tanto de Server
// Components quanto de Client Components sem risco de quebrar o build.
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

export const SAUDE_LABEL: Record<string, string> = {
  no_caminho: "No caminho",
  atencao: "Atenção",
  critica: "Crítica",
  pausada: "Pausada",
  concluida: "Concluída",
};

// Hex pros gráficos (recharts pinta via `fill`, não aceita classe Tailwind).
export const SAUDE_COLOR_HEX: Record<string, string> = {
  no_caminho: "#4ade80",
  atencao: "#fbbf24",
  critica: "#f87171",
  pausada: "#a8a29e",
  concluida: "#38bdf8",
};
