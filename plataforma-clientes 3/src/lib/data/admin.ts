import { createClient } from "@/lib/supabase/server";

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
  const [{ data: ministries }, { data: demands }, { data: campaignLinks }] = await Promise.all([
    supabase.from("ministries").select("id, name").order("name"),
    supabase.from("demands").select("ministry_id, status, prazo_acordado"),
    supabase
      .from("demand_campaigns")
      .select("campaign_id, demands(ministry_id), campaigns!inner(saude, publicada)")
      .eq("campaigns.publicada", true),
  ]);

  const today = new Date(new Date().toDateString());

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

  for (const d of demands ?? []) {
    if (d.status === "concluida" || d.status === "cancelada") continue;
    const c = getCounts(d.ministry_id);
    c.demandasAtivas++;
    if (d.prazo_acordado && new Date(d.prazo_acordado) < today) c.demandasAtrasadas++;
  }

  // campanha pode ter várias demandas do mesmo ministério — conta a
  // campanha uma vez só por ministério (Set de "ministryId:campaignId").
  const seenPerMinistry = new Set<string>();
  for (const row of campaignLinks ?? []) {
    const demand = row.demands as unknown as { ministry_id: string } | null;
    const campaign = row.campaigns as unknown as { saude: string; publicada: boolean } | null;
    if (!demand?.ministry_id || !campaign) continue;

    const key = `${demand.ministry_id}:${row.campaign_id}`;
    if (seenPerMinistry.has(key)) continue;
    seenPerMinistry.add(key);

    const c = getCounts(demand.ministry_id);
    if (campaign.saude !== "concluida") c.campanhasAtivas++;
    if (campaign.saude === "atencao" || campaign.saude === "critica") c.campanhasEmAtencaoOuCritica++;
  }

  return (ministries ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    ...getCounts(m.id),
  }));
}
