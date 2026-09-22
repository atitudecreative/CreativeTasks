import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hoje, jaPassou } from "@/lib/dates";
import { stageOf } from "@/lib/demandStages";

/* =========================================================================
   CONTADORES DO MENU
   -------------------------------------------------------------------------
   O menu lateral era decoração: sete rótulos com ícone, iguais em qualquer
   dia, dissessem os dados o que dissessem. Quem abria o portal precisava
   entrar em Demandas para descobrir que havia doze atrasadas.

   Agora "Demandas" carrega dois números — o que venceu e o que está
   esperando o ministério — e eles ficam visíveis de qualquer tela. É a
   diferença entre um menu e um painel de instrumento.

   Uma consulta só, estreita de propósito: duas colunas, sem junção, sem
   ordenação. O que vem do banco são status e prazo; a classificação por
   estágio é a mesma tabela que o resto do produto usa (lib/demandStages),
   então o badge não pode divergir da tela para onde ele leva.

   Falha aqui NÃO derruba a navegação: sem os números o menu volta a ser
   o de antes, que funcionava. É a exceção deliberada à regra de "leitura
   que vira conteúdo lança" — o menu envolve todas as telas, e uma
   indisponibilidade de contagem não pode tirar o produto do ar.
   ========================================================================= */

export type NavCounters = {
  demandasAtrasadas: number;
  demandasComMinisterio: number;
};

const VAZIO: NavCounters = { demandasAtrasadas: 0, demandasComMinisterio: 0 };

export const getNavCounters = cache(async (ministryId: string): Promise<NavCounters> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demands")
    .select("status, prazo_acordado")
    .eq("ministry_id", ministryId)
    .is("parent_demand_id", null);

  if (error) {
    console.error("Não foi possível contar as demandas do menu:", error.message);
    return VAZIO;
  }

  const hojeBr = hoje();
  let atrasadas = 0;
  let comMinisterio = 0;

  for (const d of data ?? []) {
    const estagio = stageOf(d.status as string);
    if (estagio === "ministerio") comMinisterio++;
    if (
      (estagio === "fila" || estagio === "producao" || estagio === "ministerio") &&
      jaPassou(d.prazo_acordado as string | null, hojeBr)
    ) {
      atrasadas++;
    }
  }

  return { demandasAtrasadas: atrasadas, demandasComMinisterio: comMinisterio };
});
