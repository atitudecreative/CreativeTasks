import { createClient } from "@/lib/supabase/server";

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
};

export const DELIVERABLE_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  para_aprovacao: "Para aprovação",
  aprovado: "Aprovado",
  final: "Final",
  arquivado: "Arquivado",
};

export async function getDeliverablesForMinistry(ministryId: string): Promise<Deliverable[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deliverables")
    .select(
      "id, ministry_id, campaign_id, demand_id, titulo, tipo_arquivo, versao, status, data_entrega, link_principal"
    )
    .eq("ministry_id", ministryId)
    .order("data_entrega", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar entregas:", error.message);
    return [];
  }

  return data ?? [];
}
