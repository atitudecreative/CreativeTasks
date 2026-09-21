// Opções/labels/cores de ministério — arquivo sem dependência de servidor
// (sem Supabase, sem next/headers), pra poder ser importado tanto de Server
// Components quanto de Client Components (formulários) sem risco de quebrar
// o build. Fonte única pra não duplicar essas listas em cada arquivo.
export const CATEGORIA_OPTIONS = [
  { value: "ministerio", label: "Ministério" },
  { value: "rede", label: "Rede" },
  { value: "programa", label: "Programa" },
  { value: "area_institucional", label: "Área institucional" },
  { value: "evento_recorrente", label: "Evento recorrente" },
];

export const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIA_OPTIONS.map((c) => [c.value, c.label])
);

export const MINISTRY_STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "pausado", label: "Pausado" },
  { value: "arquivado", label: "Arquivado" },
];

export const MINISTRY_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  MINISTRY_STATUS_OPTIONS.map((s) => [s.value, s.label])
);

// Tom semântico por status (ver lib/statusColors) em vez de classes
// Tailwind cruas — assim o badge de ministério segue o mesmo sistema de
// cor do resto do produto e funciona no tema escuro.
export const MINISTRY_STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  ativo: "success",
  pausado: "warning",
  arquivado: "neutral",
};
