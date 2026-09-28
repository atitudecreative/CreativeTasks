import { createClient } from "@/lib/supabase/server";
import { hoje, jaPassou } from "@/lib/dates";
import { stageOf, type StageKey } from "@/lib/demandStages";
import { DEMANDAS_CUTOFF_DATE } from "./demands";

const ESTAGIOS_EM_ANDAMENTO = new Set<StageKey>(["fila", "producao", "ministerio"]);

export type MinistryOverview = {
  id: string;
  name: string;
  demandasAtivas: number;
  demandasAtrasadas: number;
  campanhasAtivas: number;
  campanhasEmAtencaoOuCritica: number;
};

// Visão consolidada pro painel administrativo básico (PRD 8.2 / Fase 1).
// Deliberadamente simples: soma por ministério, sem os filtros e
// indicadores mais elaborados que são Fase 2.
export async function getAdminOverview(): Promise<MinistryOverview[]> {
  const supabase = await createClient();

  // Campanha não pertence mais a um ministério só (tags globais, migration
  // 0018) — "campanhasAtivas" de um ministério agora conta toda campanha
  // publicada com AO MENOS uma demanda dele, não só as que nasceram lá.
  // Por isso busca via demand_campaigns (join com demands e campaigns) em
  // vez de campaigns.ministry_id direto.
  //
  // O recorte de demandas é o MESMO da aba Demandas e do Início do
  // ministério (getDemandsForMinistry): sem subtarefa do Asana e sem prazo
  // anterior a 2026. Sem ele, este painel contava cada subtarefa como uma
  // demanda ativa e o mesmo ministério aparecia com 99 aqui e 24 na tela
  // dele — duas respostas para a mesma pergunta.
  //
  // E a campanha liberada à mão para um ministério (campaign_ministries,
  // migration 0026) também conta: é o outro caminho pelo qual o ministério
  // enxerga uma campanha, e o painel o ignorava.
  const [
    { data: ministries },
    { data: demands },
    { data: campaignLinks },
    { data: manualLinks },
    { data: publishedCampaigns },
  ] = await Promise.all([
    supabase.from("ministries").select("id, name").order("name"),
    supabase
      .from("demands")
      .select("ministry_id, status, prazo_acordado")
      .is("parent_demand_id", null)
      .or(`prazo_acordado.gte.${DEMANDAS_CUTOFF_DATE},prazo_acordado.is.null`),
    supabase
      .from("demand_campaigns")
      .select("campaign_id, demands(ministry_id), campaigns!inner(saude, publicada)")
      .eq("campaigns.publicada", true),
    supabase.from("campaign_ministries").select("ministry_id, campaign_id"),
    supabase.from("campaigns").select("id, saude").eq("publicada", true),
  ]);

  // Mesmo "hoje" de src/lib/dates.ts: dia em Brasília, comparado como
  // texto. Antes esta linha misturava meia-noite UTC (o prazo) com
  // meia-noite do servidor, e o painel da Comunicação contava demanda
  // atrasada três horas antes de ela atrasar.
  const hojeBr = hoje();

  // Uma passada só por cada tabela, acumulando num Map por ministério — em
  // vez de rodar 4 .filter() no array inteiro de demandas/campanhas pra
  // cada ministério (O(n × m), fica lento à medida que a base cresce).
  type Counts = {
    demandasAtivas: number;
    demandasAtrasadas: number;
    campanhasAtivas: number;
    campanhasEmAtencaoOuCritica: number;
  };
  const byMinistry = new Map<string, Counts>();
  const getCounts = (ministryId: string): Counts => {
    let c = byMinistry.get(ministryId);
    if (!c) {
      c = { demandasAtivas: 0, demandasAtrasadas: 0, campanhasAtivas: 0, campanhasEmAtencaoOuCritica: 0 };
      byMinistry.set(ministryId, c);
    }
    return c;
  };

  // Mesma definição de "ativa" que o Início e a barra de estágios usam
  // (lib/demandStages): fila, produção e com o ministério. A versão
  // anterior tirava só concluida e cancelada, então demanda já aprovada ou
  // publicada entrava como ativa aqui e como concluída lá — o painel da
  // Comunicação e o do ministério mostravam números diferentes para a
  // mesma pergunta.
  for (const d of demands ?? []) {
    if (!ESTAGIOS_EM_ANDAMENTO.has(stageOf(d.status))) continue;
    const c = getCounts(d.ministry_id);
    c.demandasAtivas++;
    if (jaPassou(d.prazo_acordado, hojeBr)) c.demandasAtrasadas++;
  }

  // campanha pode ter várias demandas do mesmo ministério — conta a
  // campanha uma vez só por ministério (Set de "ministryId:campaignId").
  const seenPerMinistry = new Set<string>();
  const contarCampanha = (ministryId: string, campaignId: string, saude: string) => {
    const key = `${ministryId}:${campaignId}`;
    if (seenPerMinistry.has(key)) return;
    seenPerMinistry.add(key);

    const c = getCounts(ministryId);
    if (saude !== "concluida") c.campanhasAtivas++;
    if (saude === "atencao" || saude === "critica") c.campanhasEmAtencaoOuCritica++;
  };

  for (const row of campaignLinks ?? []) {
    const demand = row.demands as unknown as { ministry_id: string } | null;
    const campaign = row.campaigns as unknown as { saude: string; publicada: boolean } | null;
    if (!demand?.ministry_id || !campaign) continue;
    contarCampanha(demand.ministry_id, row.campaign_id, campaign.saude);
  }

  const saudePublicada = new Map((publishedCampaigns ?? []).map((c) => [c.id as string, c.saude as string]));
  for (const row of manualLinks ?? []) {
    const saude = saudePublicada.get(row.campaign_id);
    if (saude == null) continue; // oculta: o ministério ainda não a vê
    contarCampanha(row.ministry_id, row.campaign_id, saude);
  }

  return (ministries ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    ...getCounts(m.id),
  }));
}
