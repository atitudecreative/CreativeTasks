import { createClient } from "@/lib/supabase/server";

export type Demand = {
  id: string;
  identificador: string | null;
  ministry_id: string;
  campaign_id: string | null;
  titulo: string;
  tipo_servico: string | null;
  prioridade: string | null;
  status: string;
  prazo_acordado: string | null;
  data_conclusao: string | null;
  pendencia_atual: string | null;
  observacao_publicada: string | null;
  fonte_externa: string;
  link_origem: string | null;
  updated_at: string;
  descricao_objetiva?: string | null;
  escopo_acordado?: string | null;
  dependencias?: string | null;
};

export const STATUS_LABEL: Record<string, string> = {
  recebida: "Recebida",
  em_triagem: "Em triagem",
  aguardando_briefing: "Aguardando briefing",
  planejada: "Planejada",
  em_producao: "Em produção",
  em_revisao_interna: "Em revisão interna",
  aguardando_ministerio: "Aguardando ministério",
  aguardando_aprovacao: "Aguardando aprovação",
  ajustes_solicitados: "Ajustes solicitados",
  aprovada: "Aprovada",
  agendada_ou_publicada: "Agendada ou publicada",
  concluida: "Concluída",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const OPEN_STATUSES = new Set(
  Object.keys(STATUS_LABEL).filter((s) => s !== "concluida" && s !== "cancelada")
);

export async function getDemandsForMinistry(ministryId: string): Promise<Demand[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demands")
    .select(
      "id, identificador, ministry_id, campaign_id, titulo, tipo_servico, prioridade, status, prazo_acordado, data_conclusao, pendencia_atual, observacao_publicada, fonte_externa, link_origem, updated_at"
    )
    .eq("ministry_id", ministryId)
    .order("prazo_acordado", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar demandas:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getDemandById(id: string): Promise<Demand | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demands")
    .select(
      "id, identificador, ministry_id, campaign_id, titulo, descricao_objetiva, tipo_servico, objetivo_entrega, escopo_acordado, prioridade, status, fase_atual, data_solicitacao, data_inicio, prazo_acordado, data_conclusao, dependencias, pendencia_atual, observacao_publicada, fonte_externa, link_origem, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar demanda:", error.message);
    return null;
  }

  return data as unknown as Demand | null;
}

export function summarizeDemands(demands: Demand[]) {
  const abertas = demands.filter((d) => OPEN_STATUSES.has(d.status));
  const concluidas = demands.filter((d) => d.status === "concluida");
  const aguardandoMinisterio = demands.filter((d) => d.status === "aguardando_ministerio");
  const aguardandoAprovacao = demands.filter((d) => d.status === "aguardando_aprovacao");
  const atrasadas = demands.filter(
    (d) =>
      OPEN_STATUSES.has(d.status) &&
      d.prazo_acordado &&
      new Date(d.prazo_acordado) < new Date(new Date().toDateString())
  );

  return {
    total: demands.length,
    abertas: abertas.length,
    concluidas: concluidas.length,
    aguardandoMinisterio: aguardandoMinisterio.length,
    aguardandoAprovacao: aguardandoAprovacao.length,
    atrasadas: atrasadas.length,
  };
}
