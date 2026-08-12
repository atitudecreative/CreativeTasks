import { createClient } from "@/lib/supabase/server";
import { STATUS_COLOR_HEX, DEFAULT_STATUS_COLOR_HEX } from "@/lib/statusColors";

export type Demand = {
  id: string;
  identificador: string | null;
  ministry_id: string;
  campaign_id: string | null;
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

export const STATUS_LABEL: Record<string, string> = {
  recebida: "Recebida",
  em_triagem: "Em triagem",
  aguardando_briefing: "Aguardando briefing",
  planejada: "Planejada",
  em_producao: "Em produção",
  em_revisao_interna: "Em revisão interna",
  aguardando_ministerio: "Aguardando ministério",
  aguardando_aprovacao: "Aguardando aprovação",
  ajustes_solicitados: "Ajustes solicitados",
  aprovada: "Aprovada",
  agendada_ou_publicada: "Agendada ou publicada",
  concluida: "Concluída",
  pausada: "Pausada",
  cancelada: "Cancelada",
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

export const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
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
      "id, identificador, ministry_id, campaign_id, titulo, tipo_servico, prioridade, status, prazo_acordado, data_conclusao, pendencia_atual, observacao_publicada, fonte_externa, link_origem, updated_at"
    )
    .eq("ministry_id", ministryId)
    .gte("prazo_acordado", DEMANDAS_CUTOFF_DATE);

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
      "id, identificador, ministry_id, campaign_id, titulo, descricao_objetiva, tipo_servico, objetivo_entrega, escopo_acordado, prioridade, status, fase_atual, data_solicitacao, data_inicio, prazo_acordado, data_conclusao, dependencias, pendencia_atual, observacao_publicada, fonte_externa, link_origem, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar demanda:", error.message);
    return null;
  }

  return data as unknown as Demand | null;
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

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMonthShortLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const raw = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
  const cleaned = raw.replace(".", "");
  const label = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return `${label}/${String(year).slice(2)}`;
}

export type MonthlyDemandStat = { month: string; label: string; total: number; concluidas: number };

// Total de demandas e quantas já concluíram, por mês (prazo acordado) —
// pra o gráfico de colunas com linha na Início. Reaproveita o mesmo
// agrupamento por mês da aba Demandas.
export function getMonthlyDemandStats(demands: Demand[]): MonthlyDemandStat[] {
  const grouped = groupDemandsByMonth(demands);
  return Array.from(grouped.entries()).map(([key, list]) => ({
    month: key,
    label: formatMonthShortLabel(key),
    total: list.length,
    concluidas: list.filter((d) => d.status === "concluida").length,
  }));
}

export type StatusBreakdownItem = { status: string; label: string; count: number; color: string };

// Contagem de demandas por status, pra gráfico de pizza na Início.
export function getStatusBreakdown(demands: Demand[]): StatusBreakdownItem[] {
  const counts = new Map<string, number>();
  for (const d of demands) {
    counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status,
      label: STATUS_LABEL[status] ?? status,
      count,
      color: STATUS_COLOR_HEX[status] ?? DEFAULT_STATUS_COLOR_HEX,
    }))
    .sort((a, b) => b.count - a.count);
}

export function summarizeDemands(demands: Demand[]) {
  const abertas = demands.filter((d) => OPEN_STATUSES.has(d.status));
  const concluidas = demands.filter((d) => d.status === "concluida");
  const aguardandoMinisterio = demands.filter((d) => d.status === "aguardando_ministerio");
  const aguardandoAprovacao = demands.filter((d) => d.status === "aguardando_aprovacao");
  const atrasadas = demands.filter(
    (d) =>
      OPEN_STATUSES.has(d.status) &&
      d.prazo_acordado &&
      new Date(d.prazo_acordado) < new Date(new Date().toDateString())
  );

  return {
    total: demands.length,
    abertas: abertas.length,
    concluidas: concluidas.length,
    aguardandoMinisterio: aguardandoMinisterio.length,
    aguardandoAprovacao: aguardandoAprovacao.length,
    atrasadas: atrasadas.length,
  };
}
