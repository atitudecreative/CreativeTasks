/* SEM CHAMADOR HOJE. A tabela `data_sources` é escrita pelos scripts de
   sincronização (Asana, Meta Ads) e guarda quando cada integração rodou
   pela última vez — a informação que responderia "os dados desta tela
   estão atualizados?". Nenhuma tela mostra isso ainda.

   Ficou de propósito na limpeza de código morto: os outros arquivos
   removidos eram lápides ("export {}" e um comentário dizendo que podiam
   ser apagados). Este tem código que funciona e resolve um problema real
   que a plataforma ainda vai querer resolver. */
import { createClient } from "@/lib/supabase/server";
import { falhaAoCarregar } from "./erros";

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
    falhaAoCarregar("as integrações deste ministério", error);
  }

  return data ?? [];
}
