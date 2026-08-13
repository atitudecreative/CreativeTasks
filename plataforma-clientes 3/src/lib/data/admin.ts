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

  const [{ data: ministries }, { data: demands }, { data: campaigns }] = await Promise.all([
    supabase.from("ministries").select("id, name").order("name"),
    supabase.from("demands").select("ministry_id, status, prazo_acordado"),
    supabase.from("campaigns").select("ministry_id, saude").eq("publicada", true),
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

  for (const camp of campaigns ?? []) {
    const c = getCounts(camp.ministry_id);
    if (camp.saude !== "concluida") c.campanhasAtivas++;
    if (camp.saude === "atencao" || camp.saude === "critica") c.campanhasEmAtencaoOuCritica++;
  }

  return (ministries ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    ...getCounts(m.id),
  }));
}
