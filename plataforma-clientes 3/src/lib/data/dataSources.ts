import { createClient } from "@/lib/supabase/server";

export type DataSource = {
  source: "asana" | "meta_ads" | "e_inscricao";
  external_id: string | null;
  last_synced_at: string | null;
};

export async function getDataSources(ministryId: string): Promise<DataSource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("data_sources")
    .select("source, external_id, last_synced_at")
    .eq("ministry_id", ministryId);

  if (error) {
    console.error("Erro ao buscar integrações:", error.message);
    return [];
  }

  return data ?? [];
}
