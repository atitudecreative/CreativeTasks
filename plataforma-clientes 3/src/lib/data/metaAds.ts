import { createClient } from "@/lib/supabase/server";

export type MetaAdCampaign = {
  id: string;
  meta_campaign_id: string;
  meta_ad_account_id: string;
  nome: string;
  status: string | null;
  campaign_id: string | null;
  matched_manualmente: boolean;
  alcance: number | null;
  impressoes: number | null;
  cliques: number | null;
  investimento: number | null;
  // Conversões reais (ex: ingressos vendidos), vindas do Pixel/Conversions
  // API configurado no site — null quando não há esse rastreamento
  // configurado (é diferente de "zero vendas").
  vendas: number | null;
  data_inicio: string | null;
  data_termino: string | null;
  synced_at: string;
};

const META_AD_CAMPAIGN_FIELDS =
  "id, meta_campaign_id, meta_ad_account_id, nome, status, campaign_id, matched_manualmente, alcance, impressoes, cliques, investimento, vendas, data_inicio, data_termino, synced_at";

// Campanhas do Meta já casadas com essa campanha/evento do portal —
// pode ser mais de uma (ex: um evento anunciado em duas campanhas
// separadas no Meta), por isso o card de detalhe soma tudo.
export async function getMetaCampaignsForCampaign(campaignId: string): Promise<MetaAdCampaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_ad_campaigns")
    .select(META_AD_CAMPAIGN_FIELDS)
    .eq("campaign_id", campaignId)
    .order("synced_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar campanhas do Meta Ads:", error.message);
    return [];
  }

  return data ?? [];
}

// Soma reach/impressions/clicks/spend/vendas de uma lista de campanhas do
// Meta — usado quando mais de uma campanha do Meta está ligada ao mesmo
// evento do portal. Também calcula as métricas derivadas (CTR, CPC, CPM,
// CPA) igual ao relatório de agência, na mesma tela.
export function summarizeMetaMetrics(rows: MetaAdCampaign[]) {
  const alcance = rows.reduce((sum, r) => sum + (r.alcance ?? 0), 0);
  const impressoes = rows.reduce((sum, r) => sum + (r.impressoes ?? 0), 0);
  const cliques = rows.reduce((sum, r) => sum + (r.cliques ?? 0), 0);
  const investimento = rows.reduce((sum, r) => sum + (r.investimento ?? 0), 0);

  // vendas só conta como "disponível" se pelo menos uma campanha tiver
  // Pixel/Conversions API configurado — senão o CPA ficaria enganoso
  // (dividindo investimento por um "0" que na verdade é "não sei").
  const vendasDisponivel = rows.some((r) => r.vendas != null);
  const vendas = vendasDisponivel ? rows.reduce((sum, r) => sum + (r.vendas ?? 0), 0) : null;

  return {
    alcance,
    impressoes,
    cliques,
    investimento,
    vendas,
    vendasDisponivel,
    ...deriveMetaKpis({ investimento, impressoes, cliques, vendas }),
  };
}

export type MetaAd = {
  id: string;
  meta_ad_id: string;
  meta_campaign_id: string;
  nome: string;
  investimento: number | null;
  impressoes: number | null;
  cliques: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  vendas: number | null;
};

export type MetaWeeklyStat = {
  semana_inicio: string;
  semana_fim: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  vendas: number | null;
};

// Deriva CTR/CPC/CPM/CPA em cima de um total (semana única ou soma de
// várias) — mesma fórmula de summarizeMetaMetrics, mas reaproveitável
// pro filtro de semana no relatório (calculado no cliente, sem nova
// consulta ao banco).
export function deriveMetaKpis(totals: {
  investimento: number;
  impressoes: number;
  cliques: number;
  vendas: number | null;
}) {
  const { investimento, impressoes, cliques, vendas } = totals;
  return {
    ctr: impressoes > 0 ? (cliques / impressoes) * 100 : null,
    cpc: cliques > 0 ? investimento / cliques : null,
    cpm: impressoes > 0 ? (investimento / impressoes) * 1000 : null,
    cpa: vendas != null && vendas > 0 ? investimento / vendas : null,
  };
}

export type MetaDemographicItem = {
  chave: string;
  investimento: number;
  vendas: number | null;
};

// IDs das campanhas do Meta vinculadas a uma campanha/evento do portal —
// passo comum às buscas de anúncios, semana e demografia abaixo (elas
// ligam por meta_campaign_id, não pela uuid do portal).
async function getMetaCampaignIdsForCampaign(campaignId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_ad_campaigns")
    .select("meta_campaign_id")
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("Erro ao buscar campanhas do Meta vinculadas:", error.message);
    return [];
  }

  return (data ?? []).map((r) => r.meta_campaign_id);
}

// Uma linha por anúncio/criativo, somando todas as campanhas do Meta
// vinculadas a esse evento — alimenta a "Tabela completa por criativo".
export async function getMetaAdsForCampaign(campaignId: string): Promise<MetaAd[]> {
  const metaCampaignIds = await getMetaCampaignIdsForCampaign(campaignId);
  if (metaCampaignIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_ads")
    .select("id, meta_ad_id, meta_campaign_id, nome, investimento, impressoes, cliques, ctr, cpc, cpm, vendas")
    .in("meta_campaign_id", metaCampaignIds)
    .order("investimento", { ascending: false });

  if (error) {
    console.error("Erro ao buscar anúncios do Meta:", error.message);
    return [];
  }

  return data ?? [];
}

// Investido x vendas por semana, somando todas as campanhas do Meta
// vinculadas — alimenta o gráfico "Evolução Semanal".
export async function getMetaWeeklyStatsForCampaign(campaignId: string): Promise<MetaWeeklyStat[]> {
  const metaCampaignIds = await getMetaCampaignIdsForCampaign(campaignId);
  if (metaCampaignIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_ad_campaign_weekly")
    .select("semana_inicio, semana_fim, investimento, impressoes, cliques, vendas")
    .in("meta_campaign_id", metaCampaignIds)
    .order("semana_inicio", { ascending: true });

  if (error) {
    console.error("Erro ao buscar evolução semanal do Meta Ads:", error.message);
    return [];
  }

  const byWeek = new Map<string, MetaWeeklyStat>();
  for (const row of data ?? []) {
    const existing = byWeek.get(row.semana_inicio);
    const investimento = (existing?.investimento ?? 0) + (row.investimento ?? 0);
    const impressoes = (existing?.impressoes ?? 0) + (row.impressoes ?? 0);
    const cliques = (existing?.cliques ?? 0) + (row.cliques ?? 0);
    const vendas =
      existing?.vendas != null || row.vendas != null ? (existing?.vendas ?? 0) + (row.vendas ?? 0) : null;
    byWeek.set(row.semana_inicio, {
      semana_inicio: row.semana_inicio,
      semana_fim: row.semana_fim,
      investimento,
      impressoes,
      cliques,
      vendas,
    });
  }

  return Array.from(byWeek.values()).sort((a, b) => a.semana_inicio.localeCompare(b.semana_inicio));
}

// Investido x vendas por gênero e por faixa etária, somando todas as
// campanhas do Meta vinculadas — alimenta a pizza de gênero e a barra de
// idade. Vem como duas listas separadas, já prontas pra cada gráfico.
export async function getMetaDemographicsForCampaign(
  campaignId: string
): Promise<{ genero: MetaDemographicItem[]; idade: MetaDemographicItem[] }> {
  const metaCampaignIds = await getMetaCampaignIdsForCampaign(campaignId);
  if (metaCampaignIds.length === 0) return { genero: [], idade: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_ad_campaign_demografia")
    .select("tipo, chave, investimento, vendas")
    .in("meta_campaign_id", metaCampaignIds);

  if (error) {
    console.error("Erro ao buscar demografia do Meta Ads:", error.message);
    return { genero: [], idade: [] };
  }

  function aggregate(tipo: "genero" | "idade"): MetaDemographicItem[] {
    const byChave = new Map<string, MetaDemographicItem>();
    for (const row of (data ?? []).filter((r) => r.tipo === tipo)) {
      const existing = byChave.get(row.chave);
      const investimento = (existing?.investimento ?? 0) + (row.investimento ?? 0);
      const vendas =
        existing?.vendas != null || row.vendas != null ? (existing?.vendas ?? 0) + (row.vendas ?? 0) : null;
      byChave.set(row.chave, { chave: row.chave, investimento, vendas });
    }
    return Array.from(byChave.values()).sort((a, b) => b.investimento - a.investimento);
  }

  return { genero: aggregate("genero"), idade: aggregate("idade") };
}

// Campanhas do Meta que o sync não conseguiu casar por nome com nenhuma
// campanha do portal — fila de revisão manual em
// /dashboard/admin/campanhas-pendentes.
export async function getUnmatchedMetaCampaigns(): Promise<MetaAdCampaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_ad_campaigns")
    .select(META_AD_CAMPAIGN_FIELDS)
    .is("campaign_id", null)
    .order("synced_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar campanhas do Meta Ads sem vínculo:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getAllCampaignNamesForLinking(): Promise<{ id: string; nome: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("campaigns").select("id, nome").order("nome");

  if (error) {
    console.error("Erro ao buscar campanhas do portal:", error.message);
    return [];
  }

  return data ?? [];
}
