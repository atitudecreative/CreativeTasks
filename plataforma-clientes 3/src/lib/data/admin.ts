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

  return (ministries ?? []).map((m) => {
    const ministryDemands = (demands ?? []).filter((d) => d.ministry_id === m.id);
    const ministryCampaigns = (campaigns ?? []).filter((c) => c.ministry_id === m.id);

    const demandasAtivas = ministryDemands.filter(
      (d) => d.status !== "concluida" && d.status !== "cancelada"
    );
    const demandasAtrasadas = demandasAtivas.filter(
      (d) => d.prazo_acordado && new Date(d.prazo_acordado) < today
    );
    const campanhasAtivas = ministryCampaigns.filter((c) => c.saude !== "concluida");
    const campanhasEmRisco = ministryCampaigns.filter(
      (c) => c.saude === "atencao" || c.saude === "critica"
    );

    return {
      id: m.id,
      name: m.name,
      demandasAtivas: demandasAtivas.length,
      demandasAtrasadas: demandasAtrasadas.length,
      campanhasAtivas: campanhasAtivas.length,
      campanhasEmAtencaoOuCritica: campanhasEmRisco.length,
    };
  });
}
