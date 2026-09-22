/* =========================================================================
   HISTÓRICO DE MUDANÇAS (audit_log)
   -------------------------------------------------------------------------
   A tabela `audit_log` existe desde a migration 0004 e passou a receber
   linhas na 0030, por trigger: toda vez que o status de uma demanda muda —
   pelo portal, pelo sync do Asana ou por SQL direto — fica registrada a
   transição.

   Quem pode LER é outra conversa: a policy da 0004 restringe a leitura à
   Comunicação global. Esta camada não contorna isso e a tela não finge o
   contrário — o bloco de histórico só é pedido para quem tem acesso, e o
   ministério vê a linha do tempo montada com as datas da própria demanda,
   que são dele.

   `Carga<T>`: histórico é leitura ACESSÓRIA. Se ela falhar, o detalhe da
   demanda continua de pé e só esse bloco avisa que não carregou.
   ========================================================================= */

import { createClient } from "@/lib/supabase/server";
import { carregado, naoCarregou, type Carga } from "./erros";
import type { LinhaDeHistorico } from "@/lib/demandTimeline";

// Teto de linhas. Uma demanda que anda para frente e para trás muitas
// vezes é exatamente o caso interessante, mas 200 transições já contam a
// história inteira — e evita que um caso patológico (um loop de sync
// escrevendo status) traga dezenas de milhares de linhas para a tela.
const TETO = 200;

export async function getStatusHistory(demandId: string): Promise<Carga<LinhaDeHistorico[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_log")
    .select("valor_anterior, valor_novo, created_at, profiles(full_name)")
    .eq("entidade_tipo", "demands")
    .eq("entidade_id", demandId)
    .eq("acao", "mudanca_status")
    .order("created_at", { ascending: true })
    .limit(TETO);

  if (error) {
    return naoCarregou("o histórico desta demanda", error);
  }

  const linhas: LinhaDeHistorico[] = (data ?? []).map((row) => {
    const perfil = row.profiles as unknown as { full_name: string | null } | null;
    const anterior = row.valor_anterior as { status?: string } | null;
    const novo = row.valor_novo as { status?: string } | null;
    return {
      valor_anterior: anterior?.status ?? null,
      valor_novo: novo?.status ?? null,
      created_at: row.created_at as string,
      // Sem autor = escrita da automação (o sync roda com service role e
      // `auth.uid()` vem nulo). Isso é informação, não lacuna.
      autor: perfil?.full_name ?? null,
    };
  });

  return carregado(linhas);
}
