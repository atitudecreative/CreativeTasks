import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { carregado, naoCarregou, type Carga } from "./erros";
import type { LinhaDemografia, LinhaSemanal } from "@/lib/home";

/* =========================================================================
   MÍDIA DO MINISTÉRIO (Home)
   -------------------------------------------------------------------------
   Semana a semana e demografia do Meta Ads para TODAS as campanhas que o
   ministério enxerga, numa leva: três consultas, não três por campanha.
   Cada linha sai marcada com a campanha do portal a que pertence, para a
   Home recortar pelo período no Node, sem voltar ao banco quando o
   período muda de 12 para 3 meses.

   Degrada, não derruba: sem mídia sincronizada (ou com a consulta
   falhando), a Home continua com os totais por campanha, que vêm de outra
   fonte (campanha_perfil). A falha vem marcada para a tela poder dizer
   "não carregou" em vez de "não há dados".
   ========================================================================= */

export type MidiaMinisterio = {
  semanal: LinhaSemanal[];
  demografia: LinhaDemografia[];
  /** Última sincronização do Meta Ads entre as campanhas vinculadas. */
  sincronizadoEm: string | null;
};

const VAZIO: MidiaMinisterio = { semanal: [], demografia: [], sincronizadoEm: null };

export const getMidiaDoMinisterio = cache(
  async (campaignIds: string[]): Promise<Carga<MidiaMinisterio>> => {
    if (campaignIds.length === 0) return carregado(VAZIO);

    const supabase = await createClient();
    const { data: metas, error } = await supabase
      .from("meta_ad_campaigns")
      .select("meta_campaign_id, campaign_id, synced_at")
      .in("campaign_id", campaignIds);

    if (error) return naoCarregou("a mídia paga das campanhas", error);
    if (!metas || metas.length === 0) return carregado(VAZIO);

    const campanhaDoMeta = new Map(metas.map((m) => [m.meta_campaign_id as string, m.campaign_id as string]));
    const metaIds = Array.from(campanhaDoMeta.keys());

    const [semanal, demografia] = await Promise.all([
      supabase
        .from("meta_ad_campaign_weekly")
        .select("meta_campaign_id, semana_inicio, semana_fim, investimento, impressoes, cliques, vendas")
        .in("meta_campaign_id", metaIds)
        .order("semana_inicio", { ascending: true }),
      supabase
        .from("meta_ad_campaign_demografia")
        .select("meta_campaign_id, tipo, chave, investimento, vendas")
        .in("meta_campaign_id", metaIds),
    ]);

    if (semanal.error) return naoCarregou("a evolução semanal da mídia", semanal.error);
    if (demografia.error) return naoCarregou("o público alcançado", demografia.error);

    const num = (v: unknown) => (v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);

    const sincronizadoEm = metas
      .map((m) => m.synced_at as string | null)
      .filter((v): v is string => Boolean(v))
      .sort()
      .pop() ?? null;

    return carregado({
      sincronizadoEm,
      semanal: (semanal.data ?? []).map((r) => ({
        campaignId: campanhaDoMeta.get(r.meta_campaign_id as string) ?? "",
        semanaInicio: String(r.semana_inicio),
        semanaFim: String(r.semana_fim),
        investimento: num(r.investimento),
        impressoes: num(r.impressoes),
        cliques: num(r.cliques),
        vendas: num(r.vendas),
      })),
      demografia: (demografia.data ?? [])
        .filter((r) => r.tipo === "genero" || r.tipo === "idade")
        .map((r) => ({
          campaignId: campanhaDoMeta.get(r.meta_campaign_id as string) ?? "",
          tipo: r.tipo as "genero" | "idade",
          chave: String(r.chave),
          investimento: num(r.investimento),
          vendas: num(r.vendas),
        })),
    });
  }
);
