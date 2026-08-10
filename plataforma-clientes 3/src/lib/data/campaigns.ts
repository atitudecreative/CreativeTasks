import { createClient } from "@/lib/supabase/server";

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
  publicada?: boolean;
  origem?: string;
};

export type PendingCampaign = Campaign & {
  ministryName: string;
  demandCount: number;
};

export const TIPO_LABEL: Record<string, string> = {
  campanha: "Campanha",
  evento: "Evento",
  lancamento: "Lançamento",
  serie: "Série",
  acao_recorrente: "Ação recorrente",
  projeto_institucional: "Projeto institucional",
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
      "id, identificador, ministry_id, nome, tipo, fase, saude, data_inicio, data_termino, data_evento, orcamento_planejado, orcamento_aprovado, investimento_realizado"
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

// Campanhas detectadas automaticamente por tag do Asana, aguardando a
// Comunicação revisar e "abrir" o evento de propósito (ver migration 0008).
export async function getPendingCampaigns(): Promise<PendingCampaign[]> {
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(
      "id, identificador, ministry_id, nome, tipo, fase, saude, data_inicio, data_termino, data_evento, orcamento_planejado, orcamento_aprovado, investimento_realizado, publicada, origem, ministries(name)"
    )
    .eq("publicada", false)
    .order("identificador", { ascending: false });

  if (error) {
    console.error("Erro ao buscar campanhas pendentes:", error.message);
    return [];
  }

  const rows = campaigns ?? [];
  const ids = rows.map((c) => c.id);

  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: demandRows, error: demandError } = await supabase
      .from("demands")
      .select("campaign_id")
      .in("campaign_id", ids);

    if (demandError) {
      console.error("Erro ao contar demandas por campanha pendente:", demandError.message);
    } else {
      for (const row of demandRows ?? []) {
        if (!row.campaign_id) continue;
        counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1);
      }
    }
  }

  return rows.map((c) => {
    const { ministries, ...rest } = c as unknown as Campaign & {
      ministries: { name: string } | null;
    };
    return {
      ...rest,
      ministryName: ministries?.name ?? "—",
      demandCount: counts.get(c.id) ?? 0,
    };
  });
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
