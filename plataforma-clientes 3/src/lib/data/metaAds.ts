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
  data_inicio: string | null;
  data_termino: string | null;
  synced_at: string;
};

const META_AD_CAMPAIGN_FIELDS =
  "id, meta_campaign_id, meta_ad_account_id, nome, status, campaign_id, matched_manualmente, alcance, impressoes, cliques, investimento, data_inicio, data_termino, synced_at";

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

// Soma reach/impressions/clicks/spend de uma lista de campanhas do Meta
// — usado quando mais de uma campanha do Meta está ligada ao mesmo
// evento do portal.
export function summarizeMetaMetrics(rows: MetaAdCampaign[]) {
  return {
    alcance: rows.reduce((sum, r) => sum + (r.alcance ?? 0), 0),
    impressoes: rows.reduce((sum, r) => sum + (r.impressoes ?? 0), 0),
    cliques: rows.reduce((sum, r) => sum + (r.cliques ?? 0), 0),
    investimento: rows.reduce((sum, r) => sum + (r.investimento ?? 0), 0),
  };
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
