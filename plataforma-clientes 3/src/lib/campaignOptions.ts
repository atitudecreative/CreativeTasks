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
