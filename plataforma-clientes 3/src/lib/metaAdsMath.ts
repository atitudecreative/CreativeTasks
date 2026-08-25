// Cálculos puros do relatório de Meta Ads (sem nenhuma dependência de
// servidor) — separado de src/lib/data/metaAds.ts de propósito: aquele
// arquivo importa createClient de @/lib/supabase/server (que usa
// next/headers), e um componente client ("use client") que importe
// QUALQUER valor de lá — mesmo uma função pura como esta — arrasta esse
// import de servidor pro bundle do navegador e quebra o build ("You're
// importing a component that needs next/headers"). Mesmo padrão já visto
// em campaignOptions.ts/demandOptions.ts: matemática/formatação pura
// fica num arquivo à parte, sem import de servidor, pra poder ser usada
// direto por componentes client.

// Deriva CTR/CPC/CPM/CPA em cima de um total (semana única ou soma de
// várias) — usado tanto no cálculo do servidor (summarizeMetaMetrics)
// quanto no filtro de semana do relatório (recalculado no cliente, sem
// nova consulta ao banco).
// Formato devolvido por summarizeMetaMetrics() (src/lib/data/metaAds.ts)
// — declarado aqui, num arquivo sem import de servidor, pra componentes
// client poderem tipar essa prop sem precisar importar (nem em tipo
// dinâmico "typeof import(...)") o módulo de servidor.
export type MetaMetricsSummary = {
  alcance: number;
  impressoes: number;
  cliques: number;
  investimento: number;
  vendas: number | null;
  vendasDisponivel: boolean;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
};

export function deriveMetaKpis(totals: {
  investimento: number;
  impressoes: number;
  cliques: number;
  vendas: number | null;
}) {
  const { investimento, impressoes, cliques, vendas } = totals;
  return {
    ctr: impressoes > 0 ? (cliques / impressoes) * 100 : null,
    cpc: cliques > 0 ? investimento / cliques : null,
    cpm: impressoes > 0 ? (investimento / impressoes) * 1000 : null,
    cpa: vendas != null && vendas > 0 ? investimento / vendas : null,
  };
}
