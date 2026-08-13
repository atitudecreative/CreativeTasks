// Opções de papel global e de papel por ministério — arquivo sem
// dependência de servidor, importável de Server e Client Components.

export const PAPEL_GLOBAL_OPTIONS = [
  { value: "nenhum", label: "Nenhum (só o que for vinculado por ministério)" },
  { value: "atendimento", label: "Atendimento da Comunicação" },
  { value: "gestor_comunicacao", label: "Gestor de Comunicação" },
  { value: "administrador_tecnico", label: "Administrador técnico" },
] as const;

export const PAPEL_GLOBAL_LABEL: Record<string, string> = {
  nenhum: "Sem papel global",
  atendimento: "Atendimento da Comunicação",
  gestor_comunicacao: "Gestor de Comunicação",
  administrador_tecnico: "Administrador técnico",
};

export const MINISTRY_ROLE_OPTIONS = [
  { value: "leitor", label: "Leitor" },
  { value: "colaborador", label: "Colaborador" },
  { value: "aprovador", label: "Aprovador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "atendimento", label: "Atendimento" },
] as const;

export const MINISTRY_ROLE_LABEL: Record<string, string> = {
  leitor: "Leitor",
  colaborador: "Colaborador",
  aprovador: "Aprovador",
  supervisor: "Supervisor",
  atendimento: "Atendimento",
};
