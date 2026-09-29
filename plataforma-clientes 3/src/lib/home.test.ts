// Testes das agregações e dos insights da Home.
//
//   node --test src/lib/home.test.ts
//
// Boa parte verifica que a regra NÃO dispara sem base — é essa a garantia
// de que a Home nunca escreve uma conclusão que os dados não sustentam.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alinharComparacao, contarPorTipo, insightsDaHome, metricasDisponiveis, publicoDoPeriodo, serieSemanal,
  type LinhaSemanal, type EntradaInsights,
} from "./home.ts";
import { resultadoDoPeriodo } from "./resultados.ts";
import type { CampanhaPerfil } from "./insights.ts";

function p(o: Partial<CampanhaPerfil>): CampanhaPerfil {
  return {
    id: "x", ministryId: "m1", nome: "C", tipo: "evento", fase: "monitoramento",
    saude: "no_caminho", dataReferencia: "2026-09-01",
    orcamentoPlanejado: null, orcamentoAprovado: null, investimento: null,
    alcance: null, impressoes: null, cliques: null, vendas: null,
    ctr: null, cpc: null, cpm: null, cpa: null,
    demandasTotal: 0, demandasConcluidas: 0, demandasComPrazoAferivel: 0, demandasNoPrazo: 0,
    cicloMedianoDias: null, entregasTotal: 0, progressoMarcos: null, ...o,
  };
}

function s(o: Partial<LinhaSemanal>): LinhaSemanal {
  return {
    campaignId: "a", semanaInicio: "2026-09-01", semanaFim: "2026-09-07",
    investimento: 100, impressoes: 1000, cliques: 20, vendas: null, ...o,
  };
}

function entrada(o: Partial<EntradaInsights> & { perfis?: CampanhaPerfil[] }): EntradaInsights {
  return {
    resultado: resultadoDoPeriodo(o.perfis ?? [], "90d", "2026-09-28"),
    rotuloAnterior: "aos 3 meses anteriores",
    serie: [],
    publico: { genero: [], idade: [] },
    orcamentos: [],
    cpaMinisterio: null,
    cpaReferencia: null,
    ...o,
  };
}

/* ------------------------------ série -------------------------------- */

test("série soma campanhas por semana e ignora as de fora do recorte", () => {
  const serie = serieSemanal(
    [
      s({ campaignId: "a", investimento: 100, vendas: 10 }),
      s({ campaignId: "b", investimento: 50, vendas: null }),
      s({ campaignId: "fora", investimento: 9999 }),
      s({ campaignId: "a", semanaInicio: "2026-09-08", investimento: 200, vendas: null }),
    ],
    new Set(["a", "b"])
  );
  assert.equal(serie.length, 2);
  assert.equal(serie[0].investimento, 150);
  assert.equal(serie[0].vendas, 10);
  assert.equal(serie[0].cpa, 15);
  // Semana sem rastreamento: resultado e custo ficam null, não zero.
  assert.equal(serie[1].vendas, null);
  assert.equal(serie[1].cpa, null);
});

test("CTR da semana vem da soma, não da média das campanhas", () => {
  const serie = serieSemanal(
    [s({ campaignId: "a", impressoes: 1000, cliques: 100 }), s({ campaignId: "b", impressoes: 9000, cliques: 90 })],
    new Set(["a", "b"])
  );
  // (100 + 90) / 10000 = 1,9% — a média das taxas daria 5,5%.
  assert.ok(Math.abs(serie[0].ctr! - 1.9) < 1e-9);
});

test("métricas disponíveis: sem conversão, resultado e custo saem do seletor", () => {
  const serie = serieSemanal([s({})], new Set(["a"]));
  assert.deepEqual(metricasDisponiveis(serie), ["investimento", "impressoes", "cliques", "ctr"]);
});

test("comparação por posição corta o período anterior no tamanho do atual", () => {
  const atual = serieSemanal([s({}), s({ semanaInicio: "2026-09-08" })], new Set(["a"]));
  const anterior = serieSemanal(
    [s({ semanaInicio: "2026-05-01" }), s({ semanaInicio: "2026-05-08" }), s({ semanaInicio: "2026-05-15" })],
    new Set(["a"])
  );
  const c = alinharComparacao(atual, anterior);
  assert.equal(c.length, 2);
  assert.equal(c[1].anterior!.semanaInicio, "2026-05-08");
  assert.equal(alinharComparacao(atual, [])[0].anterior, null);
});

/* ------------------------------ público ------------------------------ */

test("público: faixa etária na ordem das idades e participação somando 100", () => {
  const pub = publicoDoPeriodo(
    [
      { campaignId: "a", tipo: "idade", chave: "35-44", investimento: 300, vendas: 10 },
      { campaignId: "a", tipo: "idade", chave: "18-24", investimento: 100, vendas: 30 },
      { campaignId: "fora", tipo: "idade", chave: "18-24", investimento: 9999, vendas: 1 },
    ],
    new Set(["a"])
  );
  assert.deepEqual(pub.idade.map((f) => f.chave), ["18-24", "35-44"]);
  assert.equal(pub.idade[0].pctInvestimento + pub.idade[1].pctInvestimento, 100);
  assert.equal(pub.idade[0].pctVendas, 75);
  assert.equal(pub.idade[0].cpa, 100 / 30);
});

test("produção por tipo junta caixa diferente e separa quem não tem tipo", () => {
  const f = contarPorTipo(["design", "Design ", "video", null, ""]);
  assert.deepEqual(f.map((x) => [x.chave, x.total]), [["design", 2], ["sem-tipo", 2], ["video", 1]]);
  assert.equal(f[0].pct, 40);
});

/* ------------------------------ insights ----------------------------- */

test("sem dados, nenhum insight", () => {
  assert.deepEqual(insightsDaHome(entrada({})), []);
});

test("variação pequena não vira notícia", () => {
  const e = entrada({
    perfis: [
      p({ id: "a", dataReferencia: "2026-09-01", investimento: 100, vendas: 102 }),
      p({ id: "b", dataReferencia: "2026-05-01", investimento: 100, vendas: 100 }),
    ],
  });
  assert.equal(insightsDaHome(e).find((i) => i.id === "var-resultados"), undefined);
});

test("variação de resultado e de custo, com o tom certo", () => {
  const e = entrada({
    perfis: [
      p({ id: "a", dataReferencia: "2026-09-01", investimento: 100, vendas: 150 }),
      p({ id: "b", dataReferencia: "2026-05-01", investimento: 100, vendas: 100 }),
    ],
  });
  const ins = insightsDaHome(e);
  const res = ins.find((i) => i.id === "var-resultados")!;
  assert.equal(res.tom, "positivo");
  assert.match(res.texto, /cresceram 50%/);
  // Custo caiu (100/150 contra 100/100): caiu é BOM.
  assert.equal(ins.find((i) => i.id === "var-cpa")!.tom, "positivo");
});

test("uma campanha só com rastreamento vira alerta de rastreamento, não 'concentrou 100%'", () => {
  const e = entrada({
    perfis: [
      p({ id: "a", nome: "Festa", investimento: 100, vendas: 50 }),
      p({ id: "b", investimento: 100 }),
      p({ id: "c", investimento: 100 }),
    ],
  });
  const ins = insightsDaHome(e);
  assert.equal(ins.find((i) => i.id === "concentracao-resultados"), undefined);
  const r = ins.find((i) => i.id === "rastreamento")!;
  assert.match(r.texto, /Só Festa mede conversões/);
  assert.equal(r.href, "/dashboard/campanhas/a");
});

test("melhor semana exige três semanas com conversão", () => {
  const duas = serieSemanal(
    [s({ vendas: 5 }), s({ semanaInicio: "2026-09-08", vendas: 9 })],
    new Set(["a"])
  );
  assert.equal(insightsDaHome(entrada({ serie: duas })).length, 0);
  const tres = serieSemanal(
    [s({ vendas: 5 }), s({ semanaInicio: "2026-09-08", vendas: 9 }), s({ semanaInicio: "2026-09-15", vendas: 7 })],
    new Set(["a"])
  );
  const m = insightsDaHome(entrada({ serie: tres })).find((i) => i.id === "melhor-semana")!;
  assert.match(m.texto, /08\/09, com 9 resultados/);
});

test("três semanas crescendo viram sequência, não 'melhor semana'", () => {
  const serie = serieSemanal(
    [s({ vendas: 5 }), s({ semanaInicio: "2026-09-08", vendas: 9 }), s({ semanaInicio: "2026-09-15", vendas: 12 })],
    new Set(["a"])
  );
  const ins = insightsDaHome(entrada({ serie }));
  assert.ok(ins.some((i) => i.id === "sequencia"));
  assert.ok(!ins.some((i) => i.id === "melhor-semana"));
});

test("comparação com outros ministérios exige amostra de 4", () => {
  const faixa = { n: 3, p25: 40, mediana: 50, p75: 60, min: 30, max: 70 };
  assert.equal(insightsDaHome(entrada({ cpaMinisterio: 20, cpaReferencia: faixa })).length, 0);
  const ok = insightsDaHome(entrada({ cpaMinisterio: 20, cpaReferencia: { ...faixa, n: 4 } }));
  assert.match(ok[0].texto, /60% abaixo/);
});

test("orçamento estourado entra como atenção, com link", () => {
  const ins = insightsDaHome(
    entrada({ orcamentos: [{ id: "c1", nome: "Natal", orcamento: 1000, realizado: 1300 }] })
  );
  assert.equal(ins[0].tom, "atencao");
  assert.match(ins[0].texto, /Natal já usou 130%/);
  assert.equal(ins[0].href, "/dashboard/campanhas/c1");
});

test("no máximo seis insights", () => {
  const perfis = [
    p({ id: "a", dataReferencia: "2026-09-01", investimento: 900, vendas: 150, alcance: 900, demandasComPrazoAferivel: 6, demandasNoPrazo: 6 }),
    p({ id: "a2", dataReferencia: "2026-09-02", investimento: 100, vendas: 10, alcance: 100 }),
    p({ id: "b", dataReferencia: "2026-05-01", investimento: 100, vendas: 50, alcance: 100 }),
  ];
  const serie = serieSemanal(
    [s({ vendas: 5 }), s({ semanaInicio: "2026-09-08", vendas: 9 }), s({ semanaInicio: "2026-09-15", vendas: 12 })],
    new Set(["a"])
  );
  const ins = insightsDaHome(
    entrada({ perfis, serie, orcamentos: [{ id: "a", nome: "A", orcamento: 100, realizado: 900 }] })
  );
  assert.equal(ins.length, 6);
});
