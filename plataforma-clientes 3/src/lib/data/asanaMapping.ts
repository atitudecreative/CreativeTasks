import { cache } from "react";
import { falhaAoCarregar } from "./erros";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/demandOptions";

/* =========================================================================
   DE-PARA DE STATUS DO ASANA
   -------------------------------------------------------------------------
   Leitura das duas tabelas da migration 0031:

   - `asana_secoes`     — catálogo que o SYNC preenche sozinho com as
                          colunas que encontrou em cada quadro.
   - `asana_status_map` — o de-para que a Comunicação define.

   A tela de configuração cruza as duas: lista a coluna real do quadro e,
   ao lado, para qual status do portal ela aponta. Ninguém precisa digitar
   nome de coluna — o que aparece é o que existe.
   ========================================================================= */

export type SecaoVista = {
  ministryId: string;
  ministryName: string;
  secao: string;
  secaoNormalizada: string;
  totalTarefas: number;
  vistaEm: string;
};

export type RegraStatus = {
  id: string;
  ministryId: string | null;
  secaoNormalizada: string;
  status: string;
};

export type SecaoConfigurada = SecaoVista & {
  /** Regra específica deste ministério, se existir. */
  statusDoMinisterio: string | null;
  /** Regra global que vale quando não há a específica. */
  statusGlobal: string | null;
  /** O que o sync vai gravar de fato hoje. */
  statusEfetivo: string;
  /** De onde veio o valor efetivo — é o que a tela precisa explicar. */
  origem: "ministerio" | "global" | "padrao";
};

/** Fallback do sync quando nenhuma regra casa (ver scripts/asana-status.mjs). */
export const STATUS_PADRAO = "em_producao";

export const getRegrasStatus = cache(async (): Promise<RegraStatus[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asana_status_map")
    .select("id, ministry_id, secao_normalizada, status")
    .order("secao_normalizada");

  if (error) {
    falhaAoCarregar("as regras de status do Asana", error);
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    ministryId: r.ministry_id,
    secaoNormalizada: r.secao_normalizada,
    status: r.status,
  }));
});

export const getSecoesVistas = cache(async (): Promise<SecaoVista[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asana_secoes")
    .select("ministry_id, secao, secao_normalizada, total_tarefas, vista_em, ministries(name)")
    .order("total_tarefas", { ascending: false });

  if (error) {
    falhaAoCarregar("as colunas dos quadros do Asana", error);
  }

  return (data ?? []).map((r) => {
    const ministry = r.ministries as unknown as { name: string } | null;
    return {
      ministryId: r.ministry_id,
      ministryName: ministry?.name ?? "Ministério removido",
      secao: r.secao,
      secaoNormalizada: r.secao_normalizada,
      totalTarefas: r.total_tarefas,
      vistaEm: r.vista_em,
    };
  });
});

/** Cruza catálogo e regras, resolvendo a mesma precedência que o sync usa. */
export function resolverSecoes(secoes: SecaoVista[], regras: RegraStatus[]): SecaoConfigurada[] {
  const global = new Map<string, string>();
  const porMinisterio = new Map<string, Map<string, string>>();

  for (const r of regras) {
    if (r.ministryId) {
      const m = porMinisterio.get(r.ministryId) ?? new Map<string, string>();
      m.set(r.secaoNormalizada, r.status);
      porMinisterio.set(r.ministryId, m);
    } else {
      global.set(r.secaoNormalizada, r.status);
    }
  }

  return secoes.map((s) => {
    const doMinisterio = porMinisterio.get(s.ministryId)?.get(s.secaoNormalizada) ?? null;
    const statusGlobal = global.get(s.secaoNormalizada) ?? null;

    const statusEfetivo = doMinisterio ?? statusGlobal ?? STATUS_PADRAO;
    const origem: SecaoConfigurada["origem"] = doMinisterio
      ? "ministerio"
      : statusGlobal
        ? "global"
        : "padrao";

    return { ...s, statusDoMinisterio: doMinisterio, statusGlobal, statusEfetivo, origem };
  });
}

/** Regras globais que ainda não apareceram em nenhum quadro — úteis de ver
 *  (são as sugestões iniciais da migration que ninguém usa). */
export function regrasGlobaisOrfas(secoes: SecaoVista[], regras: RegraStatus[]) {
  const vistas = new Set(secoes.map((s) => s.secaoNormalizada));
  return regras
    .filter((r) => r.ministryId === null && !vistas.has(r.secaoNormalizada))
    .map((r) => ({ ...r, statusLabel: STATUS_LABEL[r.status] ?? r.status }));
}
