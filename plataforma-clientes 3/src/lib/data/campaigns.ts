import { createClient } from "@/lib/supabase/server";
import type { Demand } from "./demands";
export { TIPO_LABEL } from "@/lib/campaignOptions";

export type Campaign = {
  id: string;
  identificador: string | null;
  ministry_id: string;
  nome: string;
  tipo: string;
  fase: string;
  saude: string;
  data_inicio: string | null;
  data_termino: string | null;
  data_evento: string | null;
  orcamento_planejado: number | null;
  orcamento_aprovado: number | null;
  investimento_realizado: number | null;
  objetivo_estrategico?: string | null;
  escopo_macro?: string | null;
  resultados_observacoes?: string | null;
  // not null no banco (migration 0008) — sempre vem preenchido.
  publicada: boolean;
  origem: string;
};

export type PendingCampaign = Campaign & {
  ministryName: string;
  demandCount: number;
};

export type Milestone = {
  id: string;
  nome: string;
  peso: number;
  concluido: boolean;
  data_prevista: string | null;
  data_conclusao: string | null;
};

export const FASE_LABEL: Record<string, string> = {
  descoberta_briefing: "Descoberta e briefing",
  planejamento: "Planejamento",
  criacao: "Criação",
  producao: "Produção",
  aprovacao: "Aprovação",
  distribuicao_execucao: "Distribuição ou execução",
  monitoramento: "Monitoramento",
  encerramento_aprendizado: "Encerramento e aprendizado",
};

export const SAUDE_LABEL: Record<string, string> = {
  no_caminho: "No caminho",
  atencao: "Atenção",
  critica: "Crítica",
  pausada: "Pausada",
  concluida: "Concluída",
};

export async function getCampaignsForMinistry(ministryId: string): Promise<Campaign[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, identificador, ministry_id, nome, tipo, fase, saude, data_inicio, data_termino, data_evento, orcamento_planejado, orcamento_aprovado, investimento_realizado, publicada, origem"
    )
    .eq("ministry_id", ministryId)
    .eq("publicada", true)
    .order("data_inicio", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar campanhas:", error.message);
    return [];
  }

  return data ?? [];
}

// Todas as campanhas (ativas/visíveis ou ocultas), pra tela "Campanhas
// ativas" da Comunicação — uma lista só, agrupável por ministério, com um
// toggle por linha pra abrir/ocultar pro ministério em vez de duas listas
// separadas. Ordena por ministério e depois nome, pra facilitar o
// agrupamento na UI.
export async function getAllCampaignsAdmin(): Promise<PendingCampaign[]> {
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(
      "id, identificador, ministry_id, nome, tipo, fase, saude, data_inicio, data_termino, data_evento, orcamento_planejado, orcamento_aprovado, investimento_realizado, publicada, origem, ministries!ministry_id(name)"
    )
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao buscar campanhas:", error.message);
    return [];
  }

  const rows = campaigns ?? [];
  const ids = rows.map((c) => c.id);

  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: linkRows, error: linkError } = await supabase
      .from("demand_campaigns")
      .select("campaign_id")
      .in("campaign_id", ids);

    if (linkError) {
      console.error("Erro ao contar demandas por campanha:", linkError.message);
    } else {
      for (const row of linkRows ?? []) {
        counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1);
      }
    }
  }

  return rows
    .map((c) => {
      const { ministries, ...rest } = c as unknown as Campaign & {
        ministries: { name: string } | null;
      };
      return {
        ...rest,
        ministryName: ministries?.name ?? "—",
        demandCount: counts.get(c.id) ?? 0,
      };
    })
    .sort((a, b) => a.ministryName.localeCompare(b.ministryName, "pt-BR"));
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, identificador, ministry_id, nome, tipo, fase, saude, objetivo_estrategico, escopo_macro, data_inicio, data_termino, data_evento, orcamento_planejado, orcamento_aprovado, investimento_realizado, resultados_observacoes"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar campanha:", error.message);
    return null;
  }

  return data as unknown as Campaign | null;
}

// Todas as demandas vinculadas a uma campanha (via demand_campaigns) —
// uma demanda pode aparecer em mais de uma campanha ao mesmo tempo.
export async function getDemandsForCampaign(campaignId: string): Promise<Demand[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demand_campaigns")
    .select(
      "demands(id, identificador, ministry_id, campaign_id, titulo, tipo_servico, prioridade, status, prazo_acordado, data_conclusao, pendencia_atual, observacao_publicada, fonte_externa, link_origem, updated_at)"
    )
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("Erro ao buscar demandas da campanha:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.demands as unknown as Demand | null)
    .filter((d): d is Demand => d !== null);
}

// Mapa demand_id -> lista de campanhas vinculadas (id + nome) pra todas as
// demandas de um ministério, pra exibir badges de várias campanhas por
// demanda em listas. Busca por ministério (via campaigns.ministry_id) em
// vez de receber uma lista de ids de demanda — um ministério tem no
// máximo algumas dezenas de campanhas, então isso evita montar uma
// consulta gigante (".in()" com milhares de ids de demanda já deu "Bad
// Request" por estourar o tamanho da URL).
export async function getCampaignsForDemandsInMinistry(
  ministryId: string
): Promise<Map<string, { id: string; nome: string }[]>> {
  const map = new Map<string, { id: string; nome: string }[]>();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demand_campaigns")
    .select("demand_id, campaigns!inner(id, nome, ministry_id)")
    .eq("campaigns.ministry_id", ministryId);

  if (error) {
    console.error("Erro ao buscar campanhas vinculadas às demandas:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const campaign = row.campaigns as unknown as { id: string; nome: string } | null;
    if (!campaign) continue;
    const list = map.get(row.demand_id) ?? [];
    list.push(campaign);
    map.set(row.demand_id, list);
  }

  return map;
}

export async function getMilestonesForCampaign(campaignId: string): Promise<Milestone[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("milestones")
    .select("id, nome, peso, concluido, data_prevista, data_conclusao")
    .eq("campaign_id", campaignId)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao buscar marcos:", error.message);
    return [];
  }

  return data ?? [];
}

// Progresso ponderado por marcos (PRD 8.5): soma dos pesos concluídos
// dividida pela soma dos pesos aplicáveis, multiplicada por 100.
export function calculateProgress(milestones: Milestone[]): number | null {
  if (milestones.length === 0) return null;
  const totalWeight = milestones.reduce((sum, m) => sum + m.peso, 0);
  if (totalWeight === 0) return null;
  const doneWeight = milestones
    .filter((m) => m.concluido)
    .reduce((sum, m) => sum + m.peso, 0);
  return Math.round((doneWeight / totalWeight) * 100);
}
