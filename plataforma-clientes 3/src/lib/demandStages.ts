/* =========================================================================
   ESTÁGIOS DE DEMANDA
   -------------------------------------------------------------------------
   O produto tem 14 status de demanda. Os 14 continuam existindo — no
   filtro, no badge da linha, no detalhe. O que eles NÃO servem é pra
   virar gráfico: 14 fatias num gráfico de pizza (que era o que a tela
   fazia) é ilegível, e a orientação de visualização é clara — acima de
   ~7 classes, ou agrupa ou vira tabela.

   Aqui os 14 status são dobrados em 5 ESTÁGIOS, e o critério não é
   estético, é a pergunta que o cliente faz: "em que pé isso está, e tem
   algo esperando por mim?".

   O estágio "Com o ministério" é o que justifica o agrupamento: ele junta
   os três status em que a bola está com o CLIENTE, e vira a informação
   mais acionável do painel — antes essa leitura não existia em lugar
   nenhum, ficava diluída em três fatias pequenas.
   ========================================================================= */

export type StageKey = "fila" | "producao" | "ministerio" | "concluida" | "parada";

export const STAGE_OF_STATUS: Record<string, StageKey> = {
  recebida: "fila",
  em_triagem: "fila",
  aguardando_briefing: "fila",
  planejada: "fila",

  em_producao: "producao",
  em_revisao_interna: "producao",

  aguardando_ministerio: "ministerio",
  aguardando_aprovacao: "ministerio",
  ajustes_solicitados: "ministerio",

  aprovada: "concluida",
  agendada_ou_publicada: "concluida",
  concluida: "concluida",

  pausada: "parada",
  cancelada: "parada",
};

export const STAGE_ORDER: StageKey[] = ["fila", "producao", "ministerio", "concluida", "parada"];

export const STAGE_META: Record<
  StageKey,
  { label: string; short: string; description: string; cssVar: string; tone: "info" | "accent" | "warning" | "success" | "neutral" }
> = {
  fila: {
    label: "Na fila",
    short: "Fila",
    description: "Recebida, em triagem ou planejada — ainda não começou a produção",
    cssVar: "--stage-fila",
    tone: "info",
  },
  producao: {
    label: "Em produção",
    short: "Produção",
    description: "A equipe da Comunicação está trabalhando nela agora",
    cssVar: "--stage-producao",
    tone: "accent",
  },
  ministerio: {
    label: "Com o ministério",
    short: "Com você",
    description: "Esperando resposta, aprovação ou ajuste do seu lado",
    cssVar: "--stage-ministerio",
    tone: "warning",
  },
  concluida: {
    label: "Concluída",
    short: "Concluída",
    description: "Aprovada, publicada ou finalizada",
    cssVar: "--stage-concluida",
    tone: "success",
  },
  parada: {
    label: "Parada",
    short: "Parada",
    description: "Pausada ou cancelada",
    cssVar: "--stage-parada",
    tone: "neutral",
  },
};

export function stageOf(status: string): StageKey {
  return STAGE_OF_STATUS[status] ?? "fila";
}

export type StageCount = {
  key: StageKey;
  label: string;
  short: string;
  description: string;
  count: number;
  cssVar: string;
  color: string;
};

/** Contagem por estágio, sempre na ORDEM DO FLUXO (não por tamanho): a
 *  barra empilhada tem que ler como uma esteira da esquerda pra direita.
 *  Estágio zerado é omitido — segmento de largura 0 só suja a legenda. */
export function countByStage(statuses: string[]): StageCount[] {
  const counts = new Map<StageKey, number>();
  for (const s of statuses) {
    const k = stageOf(s);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return STAGE_ORDER.filter((k) => (counts.get(k) ?? 0) > 0).map((k) => ({
    key: k,
    label: STAGE_META[k].label,
    short: STAGE_META[k].short,
    description: STAGE_META[k].description,
    count: counts.get(k) ?? 0,
    cssVar: STAGE_META[k].cssVar,
    color: `rgb(var(${STAGE_META[k].cssVar}))`,
  }));
}
