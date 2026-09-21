import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CampanhaPerfil } from "@/lib/insights";

/* =========================================================================
   LEITURA DO PERFIL DE CAMPANHA
   -------------------------------------------------------------------------
   Lê a view `campanha_perfil` (migration 0032), que já devolve tudo
   agregado por campanha — mídia, demandas, entregas e marcos — em vez de
   montar isso com quatro consultas e um .reduce() no Node.

   A view roda com `security_invoker`, então o RLS de quem está logado se
   aplica: um ministério compara contra o próprio histórico e a
   Comunicação contra a carteira inteira. Nada aqui precisa (nem deve)
   filtrar por ministério à mão.
   ========================================================================= */

const CAMPOS =
  "id, ministry_id, nome, tipo, fase, saude, publicada, data_referencia, " +
  "orcamento_planejado, orcamento_aprovado, investimento, " +
  "alcance, impressoes, cliques, vendas, ctr, cpc, cpm, cpa, " +
  "demandas_total, demandas_concluidas, demandas_com_prazo_aferivel, demandas_no_prazo, " +
  "ciclo_mediano_dias, entregas_total, progresso_marcos";

type Linha = Record<string, unknown>;

/** numeric do Postgres chega como string no PostgREST quando passa da
 *  precisão de um double — converter na mão evita "12.40" virar NaN
 *  silenciosamente lá na frente. */
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function int(v: unknown): number {
  return num(v) ?? 0;
}

function mapear(r: Linha): CampanhaPerfil {
  return {
    id: String(r.id),
    ministryId: r.ministry_id ? String(r.ministry_id) : null,
    nome: String(r.nome ?? ""),
    tipo: String(r.tipo ?? ""),
    fase: String(r.fase ?? ""),
    saude: String(r.saude ?? ""),
    dataReferencia: r.data_referencia ? String(r.data_referencia) : null,

    orcamentoPlanejado: num(r.orcamento_planejado),
    orcamentoAprovado: num(r.orcamento_aprovado),
    investimento: num(r.investimento),

    alcance: num(r.alcance),
    impressoes: num(r.impressoes),
    cliques: num(r.cliques),
    vendas: num(r.vendas),

    ctr: num(r.ctr),
    cpc: num(r.cpc),
    cpm: num(r.cpm),
    cpa: num(r.cpa),

    demandasTotal: int(r.demandas_total),
    demandasConcluidas: int(r.demandas_concluidas),
    demandasComPrazoAferivel: int(r.demandas_com_prazo_aferivel),
    demandasNoPrazo: int(r.demandas_no_prazo),
    cicloMedianoDias: num(r.ciclo_mediano_dias),

    entregasTotal: int(r.entregas_total),
    progressoMarcos: num(r.progresso_marcos),
  };
}

/**
 * Universo de comparação: todas as campanhas que o usuário logado pode
 * ver. É a base de qualquer benchmark — e o RLS já garante o recorte.
 *
 * Só campanhas publicadas entram: uma campanha ainda oculta está em
 * cadastro, com número pela metade, e contaminaria a mediana.
 */
export const getUniversoComparacao = cache(async (): Promise<CampanhaPerfil[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campanha_perfil")
    .select(CAMPOS)
    .eq("publicada", true);

  if (error) {
    // Falha aqui não pode derrubar o relatório: sem universo, a tela
    // simplesmente não mostra comparação.
    console.error("Erro ao carregar o universo de comparação:", error.message);
    return [];
  }

  return (data ?? []).map((r) => mapear(r as unknown as Linha));
});

/** Perfil de UMA campanha — inclusive quando ela ainda está oculta. */
export const getPerfilCampanha = cache(async (campaignId: string): Promise<CampanhaPerfil | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campanha_perfil")
    .select(CAMPOS)
    .eq("id", campaignId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar o perfil da campanha:", error.message);
    return null;
  }

  return data ? mapear(data as unknown as Linha) : null;
});
