import { createClient } from "@/lib/supabase/server";
import { hoje, jaPassou, formatarMesCurto } from "@/lib/dates";
import { STATUS_LABEL, PRIORIDADE_LABEL } from "@/lib/demandOptions";
export { STATUS_LABEL, PRIORIDADE_LABEL } from "@/lib/demandOptions";

export type Demand = {
  id: string;
  identificador: string | null;
  ministry_id: string;
  campaign_id: string | null;
  parent_demand_id: string | null;
  titulo: string;
  tipo_servico: string | null;
  prioridade: string | null;
  status: string;
  prazo_acordado: string | null;
  data_conclusao: string | null;
  pendencia_atual: string | null;
  observacao_publicada: string | null;
  fonte_externa: string;
  link_origem: string | null;
  updated_at: string;
  descricao_objetiva?: string | null;
  escopo_acordado?: string | null;
  dependencias?: string | null;
};

const OPEN_STATUSES = new Set(
  Object.keys(STATUS_LABEL).filter((s) => s !== "concluida" && s !== "cancelada")
);

export type DemandFilters = {
  status?: string;
  // id de uma campanha específica, ou "none" para "sem campanha vinculada"
  campaignId?: string;
  prioridade?: string;
};

// Demandas com prazo antes disso são sincronizações antigas do Asana que só
// poluem a aba — a partir daqui a visualização só mostra 2026 em diante.
const DEMANDAS_CUTOFF_DATE = "2026-01-01";

export async function getDemandsForMinistry(
  ministryId: string,
  filters: DemandFilters = {}
): Promise<Demand[]> {
  const supabase = await createClient();

  let query = supabase
    .from("demands")
    .select(
      "id, identificador, ministry_id, campaign_id, parent_demand_id, titulo, tipo_servico, prioridade, status, prazo_acordado, data_conclusao, pendencia_atual, observacao_publicada, fonte_externa, link_origem, updated_at"
    )
    .eq("ministry_id", ministryId)
    // Subtarefa do Asana ("demanda filha") não aparece na listagem principal
    // — só no detalhe da demanda pai (getChildDemands). Sem esse filtro, a
    // aba Demandas duplicaria: o card pai E cada filha como linha própria.
    .is("parent_demand_id", null)
    // O corte é só pra tarefa ANTIGA (prazo antes de 2026) — demanda sem
    // prazo nenhum (ex: tarefas "guarda-chuva" tipo "Frases Impulso
    // Pastoral", usadas só pra organizar subtarefas) não é lixo antigo, é
    // ativa, e precisa continuar visível (a tela já agrupa isso em "Sem
    // prazo definido"). Antes esse .gte() também excluía essas por engano,
    // porque no Postgres uma comparação com NULL nunca dá "true".
    .or(`prazo_acordado.gte.${DEMANDAS_CUTOFF_DATE},prazo_acordado.is.null`);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.prioridade) query = query.eq("prioridade", filters.prioridade);

  // Uma demanda pode estar em várias campanhas (demand_campaigns), então o
  // filtro por campanha precisa passar por essa tabela de junção — não dá
  // mais pra confiar só na coluna campaign_id (que só guarda um vínculo
  // "legado", de cadastro manual).
  if (filters.campaignId === "none") {
    const { data: linkedRows } = await supabase.from("demand_campaigns").select("demand_id");
    const linkedIds = Array.from(new Set((linkedRows ?? []).map((r) => r.demand_id)));
    if (linkedIds.length > 0) {
      query = query.not("id", "in", `(${linkedIds.join(",")})`).is("campaign_id", null);
    } else {
      query = query.is("campaign_id", null);
    }
  } else if (filters.campaignId) {
    const { data: linkedRows } = await supabase
      .from("demand_campaigns")
      .select("demand_id")
      .eq("campaign_id", filters.campaignId);
    const ids = (linkedRows ?? []).map((r) => r.demand_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query.order("prazo_acordado", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar demandas:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getDemandById(id: string): Promise<Demand | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demands")
    .select(
      "id, identificador, ministry_id, campaign_id, parent_demand_id, titulo, descricao_objetiva, tipo_servico, objetivo_entrega, escopo_acordado, prioridade, status, fase_atual, data_solicitacao, data_inicio, prazo_acordado, data_conclusao, dependencias, pendencia_atual, observacao_publicada, fonte_externa, link_origem, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar demanda:", error.message);
    return null;
  }

  return data as unknown as Demand | null;
}

// Demandas filhas (subtarefas do Asana) de uma demanda pai — mostradas no
// detalhe do card, com o status de cada uma. Sem corte de data: se a
// demanda pai apareceu na listagem, suas filhas também devem aparecer no
// detalhe dela, independente do prazo.
export async function getChildDemands(parentDemandId: string): Promise<Demand[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demands")
    .select(
      "id, identificador, ministry_id, campaign_id, parent_demand_id, titulo, tipo_servico, prioridade, status, prazo_acordado, data_conclusao, pendencia_atual, observacao_publicada, fonte_externa, link_origem, updated_at"
    )
    .eq("parent_demand_id", parentDemandId)
    .order("prazo_acordado", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar demandas filhas:", error.message);
    return [];
  }

  return data ?? [];
}

// Quantas demandas filhas cada demanda de um ministério tem — usado pra
// mostrar um badge ("+3 subtarefas") na listagem principal sem precisar
// abrir o detalhe de cada card.
export async function getChildDemandCounts(ministryId: string): Promise<Map<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demands")
    .select("parent_demand_id")
    .eq("ministry_id", ministryId)
    .not("parent_demand_id", "is", null);

  const counts = new Map<string, number>();
  if (error) {
    console.error("Erro ao contar demandas filhas:", error.message);
    return counts;
  }

  for (const row of data ?? []) {
    const parentId = row.parent_demand_id as string;
    counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
  }
  return counts;
}

// Agrupa demandas por mês do prazo acordado (chave "YYYY-MM"). Como a
// consulta já ordena por prazo_acordado ascendente, a ordem de inserção no
// Map sai cronológica, sem precisar reordenar depois.
export function groupDemandsByMonth(demands: Demand[]): Map<string, Demand[]> {
  const groups = new Map<string, Demand[]>();
  for (const d of demands) {
    if (!d.prazo_acordado) continue;
    const key = d.prazo_acordado.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(d);
    groups.set(key, list);
  }
  return groups;
}

export type MonthlyDemandStat = {
  month: string;
  label: string;
  total: number;
  concluidas: number;
  /** Mês que ainda não terminou: o total dele ainda vai crescer. */
  emCurso: boolean;
  /** Mês no futuro: são prazos combinados, não trabalho já realizado. */
  futuro: boolean;
};

// Demandas por mês de PRAZO, com quantas já fecharam.
//
// Duas correções em relação à versão anterior:
//
// 1. Mês sem nenhuma demanda deixava de existir na série. O gráfico então
//    encostava fevereiro em maio como se fossem meses vizinhos, e a
//    inclinação da linha passava a mentir sobre o ritmo. Agora o intervalo
//    é preenchido: mês sem prazo nenhum aparece como zero de verdade.
//
// 2. Cada mês vem marcado como em curso ou futuro. Isso importa porque a
//    série é de PRAZO, não de execução: os últimos pontos são compromisso
//    combinado, não trabalho entregue, e comparar o mês corrente (parcial)
//    com o anterior (fechado) produz uma queda que não aconteceu.
export function getMonthlyDemandStats(
  demands: Demand[],
  referencia: string = hoje()
): MonthlyDemandStat[] {
  const grouped = groupDemandsByMonth(demands);
  if (grouped.size === 0) return [];

  const chaves = Array.from(grouped.keys()).sort();
  const mesAtual = referencia.slice(0, 7);

  const meses: string[] = [];
  let atual = chaves[0];
  const fim = chaves[chaves.length - 1];
  // Guarda de sanidade: um prazo digitado errado (ano 2205) geraria
  // milhares de meses vazios. 120 é uma década — muito além de qualquer
  // planejamento real, e para o laço antes de a série virar um problema.
  while (atual <= fim && meses.length < 120) {
    meses.push(atual);
    const ano = +atual.slice(0, 4);
    const mes = +atual.slice(5, 7);
    atual = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
  }

  return meses.map((key) => {
    const list = grouped.get(key) ?? [];
    return {
      month: key,
      label: formatarMesCurto(key),
      total: list.length,
      concluidas: list.filter((d) => d.status === "concluida").length,
      emCurso: key === mesAtual,
      futuro: key > mesAtual,
    };
  });
}

// Demanda "atrasada": ainda aberta, tem prazo definido, e o prazo já
// passou. Usado tanto no resumo da Início quanto pra destacar a linha na
// lista de Demandas.
//
// `referencia` é a data de hoje em Brasília ("YYYY-MM-DD"). Fica como
// parâmetro por dois motivos: quem percorre uma lista calcula uma vez só
// em vez de uma por linha, e o comportamento vira testável sem mexer no
// relógio do processo. A versão anterior comparava `new Date(prazo)`
// (meia-noite UTC) com `new Date(new Date().toDateString())` (meia-noite
// local do SERVIDOR) — dois relógios diferentes. Em produção o Node roda
// em UTC, então das 21h às 23h59 de Brasília toda demanda que vencia
// "hoje" já aparecia atrasada. Ver src/lib/dates.ts.
export function isOverdue(d: Demand, referencia: string = hoje()): boolean {
  return OPEN_STATUSES.has(d.status) && jaPassou(d.prazo_acordado, referencia);
}

export function summarizeDemands(demands: Demand[]) {
  const hojeBr = hoje();
  const abertas = demands.filter((d) => OPEN_STATUSES.has(d.status));
  const concluidas = demands.filter((d) => d.status === "concluida");
  const aguardandoMinisterio = demands.filter((d) => d.status === "aguardando_ministerio");
  const aguardandoAprovacao = demands.filter((d) => d.status === "aguardando_aprovacao");
  const atrasadas = demands.filter((d) => isOverdue(d, hojeBr));

  return {
    total: demands.length,
    abertas: abertas.length,
    concluidas: concluidas.length,
    aguardandoMinisterio: aguardandoMinisterio.length,
    aguardandoAprovacao: aguardandoAprovacao.length,
    atrasadas: atrasadas.length,
  };
}
