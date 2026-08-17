import { createClient } from "@/lib/supabase/server";

export { DELIVERABLE_STATUS_LABEL } from "@/lib/deliverableOptions";

export type Deliverable = {
  id: string;
  ministry_id: string;
  campaign_id: string | null;
  demand_id: string | null;
  titulo: string;
  tipo_arquivo: string | null;
  versao: string | null;
  status: string;
  data_entrega: string | null;
  link_principal: string | null;
  links_complementares: string[];
  observacao_uso: string | null;
};

const DELIVERABLE_FIELDS =
  "id, ministry_id, campaign_id, demand_id, titulo, tipo_arquivo, versao, status, data_entrega, link_principal, links_complementares, observacao_uso";

export async function getDeliverablesForMinistry(ministryId: string): Promise<Deliverable[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deliverables")
    .select(DELIVERABLE_FIELDS)
    .eq("ministry_id", ministryId)
    .order("data_entrega", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar entregas:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Deliverable[];
}

export async function getDeliverablesForCampaign(campaignId: string): Promise<Deliverable[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deliverables")
    .select(DELIVERABLE_FIELDS)
    .eq("campaign_id", campaignId)
    .order("data_entrega", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar entregas da campanha:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Deliverable[];
}

export async function getDeliverablesForDemand(demandId: string): Promise<Deliverable[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deliverables")
    .select(DELIVERABLE_FIELDS)
    .eq("demand_id", demandId)
    .order("data_entrega", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar entregas da demanda:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Deliverable[];
}
