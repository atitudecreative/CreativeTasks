import { createClient } from "@/lib/supabase/server";
import type { Demand } from "./demands";
import { SAUDE_LABEL, SAUDE_COLOR_HEX } from "@/lib/campaignOptions";
export { TIPO_LABEL, TIPO_OPTIONS, FASE_LABEL, FASE_OPTIONS, SAUDE_LABEL, SAUDE_OPTIONS } from "@/lib/campaignOptions";

export type Campaign = {
  id: string;
  identificador: string | null;
  // "Ministério de origem" (quem criou a tag primeiro) — não é mais
  // dono/limite de acesso: uma campanha pode ter demandas de vários
  // ministérios (tags viraram globais, migration 0018). Pode ficar null
  // se o ministério de origem for excluído depois.
  ministry_id: string | null;
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
  // migration 0012 — pasta (agrupamento) e posição de exibição dentro dela
  // (ou dentro de "sem pasta", quando folder_id é null).
  folder_id: string | null;
  posicao: number;
  // Arte de capa (migration 0023) — banner exibido no topo da tela de
  // detalhe da campanha. Null = sem capa, mostra só o cabeçalho de texto.
  capa_url: string | null;
};

export type PendingCampaign = Campaign & {
  // Nomes de todos os ministérios com pelo menos uma demanda vinculada a
  // essa campanha — pode ter mais de um (é o sentido de tag global).
  ministryNames: string[];
  demandCount: number;
};

export type CampaignFolder = {
  id: string;
  nome: string;
  posicao: number;
};

export type Milestone = {
  id: string;
  nome: string;
  peso: number;
  concluido: boolean;
  data_prevista: string | null;
  data_conclusao: string | null;
};

export type SaudeBreakdownItem = { saude: string; label: string; count: number; color: string };

// Contagem de campanhas por saúde (fase de andamento), pra gráfico de
// pizza na Início. Recebe as campanhas já buscadas — não faz query nova.
export function getSaudeBreakdown(campaigns: Campaign[]): SaudeBreakdownItem[] {
  const counts = new Map<string, number>();
  for (const c of campaigns) {
    counts.set(c.saude, (counts.get(c.saude) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([saude, count]) => ({
      saude,
      label: SAUDE_LABEL[saude] ?? saude,
      count,
      color: SAUDE_COLOR_HEX[saude] ?? "#a8a29e",
    }))
    .sort((a, b) => b.count - a.count);
}

export type BudgetSummaryItem = { label: string; value: number; color: string };

// Soma planejado x aprovado x investido em cima de todas as campanhas
// recebidas (sem filtrar por saúde) — visão financeira do Início, no
// lugar do gráfico de "campanhas por saúde" (pouco acionável sozinho).
export function getBudgetSummary(campaigns: Campaign[]): BudgetSummaryItem[] {
  const planejado = campaigns.reduce((sum, c) => sum + (c.orcamento_planejado ?? 0), 0);
  const aprovado = campaigns.reduce((sum, c) => sum + (c.orcamento_aprovado ?? 0), 0);
  const investido = campaigns.reduce((sum, c) => sum + (c.investimento_realizado ?? 0), 0);

  return [
    { label: "Planejado", value: planejado, color: "#a8a29e" },
    { label: "Aprovado", value: aprovado, color: "rgb(var(--brand-500))" },
    { label: "Investido", value: investido, color: "#4ade80" },
  ];
}

export async function getCampaignsForMinistry(ministryId: string): Promise<Campaign[]> {
  const supabase = await createClient();

  // Campanha não pertence mais a um ministério só — uma tag pode
  // aparecer em vários (migration 0018). Um ministério vê uma campanha
  // se tiver AO MENOS uma demanda sua vinculada a ela (e ela estiver
  // publicada), não só quando ele é o "ministério de origem".
  const { data: linkRows, error: linkError } = await supabase
    .from("demand_campaigns")
    .select("campaign_id, demands!inner(ministry_id)")
    .eq("demands.ministry_id", ministryId);

  if (linkError) {
    console.error("Erro ao buscar campanhas do ministério:", linkError.message);
    return [];
  }

  const campaignIds = Array.from(new Set((linkRows ?? []).map((r) => r.campaign_id)));
  if (campaignIds.length === 0) return [];

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, identificador, ministry_id, nome, tipo, fase, saude, data_inicio, data_termino, data_evento, orcamento_planejado, orcamento_aprovado, investimento_realizado, publicada, origem, folder_id, posicao, capa_url"
    )
    .in("id", campaignIds)
    .eq("publicada", true)
    .order("data_inicio", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar campanhas:", error.message);
    return [];
  }

  return data ?? [];
}

// Todas as campanhas (ativas/visíveis ou ocultas), pra tela "Campanhas
// ativas" da Comunicação — uma lista só, organizável em pastas, com um
// toggle por linha pra abrir/ocultar pros ministérios envolvidos em vez
// de duas listas separadas. Não agrupa mais por ministério "dono" (tags
// são globais desde a migration 0018) — em vez disso, cada campanha traz
// a lista de nomes de todos os ministérios que têm demanda vinculada a
// ela, pra mostrar como badge na linha.
export async function getAllCampaignsAdmin(): Promise<PendingCampaign[]> {
  const supabase = await createClient();

  const [{ data: campaigns, error }, { data: ministries }] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "id, identificador, ministry_id, nome, tipo, fase, saude, data_inicio, data_termino, data_evento, orcamento_planejado, orcamento_aprovado, investimento_realizado, publicada, origem, folder_id, posicao, capa_url"
      )
      .order("posicao", { ascending: true })
      .order("nome", { ascending: true }),
    supabase.from("ministries").select("id, name"),
  ]);

  if (error) {
    console.error("Erro ao buscar campanhas:", error.message);
    return [];
  }

  const rows = campaigns ?? [];
  const ids = rows.map((c) => c.id);
  const ministryNameById = new Map((ministries ?? []).map((m) => [m.id, m.name] as const));

  const demandCounts = new Map<string, number>();
  const ministryIdsByCampaign = new Map<string, Set<string>>();

  if (ids.length > 0) {
    const { data: linkRows, error: linkError } = await supabase
      .from("demand_campaigns")
      .select("campaign_id, demands(ministry_id)")
      .in("campaign_id", ids);

    if (linkError) {
      console.error("Erro ao contar demandas por campanha:", linkError.message);
    } else {
      for (const row of linkRows ?? []) {
        demandCounts.set(row.campaign_id, (demandCounts.get(row.campaign_id) ?? 0) + 1);

        const demand = row.demands as unknown as { ministry_id: string } | null;
        if (demand?.ministry_id) {
          const set = ministryIdsByCampaign.get(row.campaign_id) ?? new Set<string>();
          set.add(demand.ministry_id);
          ministryIdsByCampaign.set(row.campaign_id, set);
        }
      }
    }
  }

  return rows
    .map((c) => {
      const ministryNames = Array.from(ministryIdsByCampaign.get(c.id) ?? [])
        .map((id) => ministryNameById.get(id))
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b, "pt-BR"));

      return {
        ...c,
        ministryNames,
        demandCount: demandCounts.get(c.id) ?? 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

// Todas as pastas de campanha — agora globais (migration 0018), não
// pertencem mais a um ministério específico.
export async function getAllCampaignFoldersAdmin(): Promise<CampaignFolder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_folders")
    .select("id, nome, posicao")
    .order("posicao", { ascending: true });

  if (error) {
    console.error("Erro ao buscar pastas de campanha:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, identificador, ministry_id, nome, tipo, fase, saude, objetivo_estrategico, escopo_macro, data_inicio, data_termino, data_evento, orcamento_planejado, orcamento_aprovado, investimento_realizado, resultados_observacoes, publicada, origem, folder_id, posicao, capa_url"
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
// demanda em listas. Filtra pelo ministério da DEMANDA (não mais da
// campanha — desde a migration 0018 uma campanha pode ter demandas de
// vários ministérios), evitando montar uma consulta gigante
// (".in()" com milhares de ids de demanda já deu "Bad Request" por
// estourar o tamanho da URL).
export async function getCampaignsForDemandsInMinistry(
  ministryId: string
): Promise<Map<string, { id: string; nome: string }[]>> {
  const map = new Map<string, { id: string; nome: string }[]>();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demand_campaigns")
    .select("demand_id, campaigns(id, nome), demands!inner(ministry_id)")
    .eq("demands.ministry_id", ministryId);

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
