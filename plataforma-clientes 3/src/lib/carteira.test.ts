// Testes da visão de carteira.
//
// O ponto sensível aqui é a diferença entre "zero" e "não sei". Somar
// conversão de campanhas sem rastreamento e mostrar 0 seria afirmar que
// não houve resultado — vários testes existem só pra garantir que isso
// não acontece.
//
//   npm run test:carteira

import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirCarteira, lerMinisterio, periodoAnterior, noPeriodo } from "./carteira.ts";
import type { CampanhaPerfil } from "./insights.ts";

function p(o: Partial<CampanhaPerfil>): CampanhaPerfil {
  return {
    id: "x", ministryId: "m1", nome: "C", tipo: "evento", fase: "monitoramento",
    saude: "no_caminho", dataReferencia: "2026-06-01",
    orcamentoPlanejado: null, orcamentoAprovado: null, investimento: null,
    alcance: null, impressoes: null, cliques: null, vendas: null,
    ctr: null, cpc: null, cpm: null, cpa: null,
    demandasTotal: 0, demandasConcluidas: 0, demandasComPrazoAferivel: 0, demandasNoPrazo: 0,
    cicloMedianoDias: null, entregasTotal: 0, progressoMarcos: null, ...o,
  };
}

/* ------------------------------ período -------------------------------- */

test("período anterior tem a mesma duração e termina um dia antes", () => {
  // 01/04 a 30/06 = 91 dias contando os extremos. A janela anterior
  // termina em 31/03 e precisa ter os mesmos 91 dias, o que a leva até
  // 31/12 do ano anterior — não até 01/01, que daria 90.
  const ant = periodoAnterior("2026-04-01", "2026-06-30");
  assert.equal(ant.fim, "2026-03-31");
  assert.equal(ant.inicio, "2025-12-31");

  const dias = (a: string, b: string) =>
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000;
  assert.equal(dias("2026-04-01", "2026-06-30"), dias(ant.inicio, ant.fim));
});

test("filtro de período inclui os dois extremos", () => {
  const lista = [
    p({ id: "a", dataReferencia: "2026-04-01" }),
    p({ id: "b", dataReferencia: "2026-05-15" }),
    p({ id: "c", dataReferencia: "2026-06-30" }),
    p({ id: "fora", dataReferencia: "2026-07-01" }),
    p({ id: "semdata", dataReferencia: null }),
  ];
  const dentro = noPeriodo(lista, "2026-04-01", "2026-06-30").map((c) => c.id);
  assert.deepEqual(dentro, ["a", "b", "c"]);
});

/* --------------------------- zero x não sei ---------------------------- */

test("sem nenhuma conversão rastreada, resultados é null e não zero", () => {
  const r = resumirCarteira([p({ investimento: 1000, vendas: null }), p({ investimento: 2000, vendas: null })]);
  assert.equal(r.resultados, null);
  assert.equal(r.investimento, 3000);
});

test("com rastreamento parcial, soma só o que existe", () => {
  const r = resumirCarteira([p({ vendas: 100 }), p({ vendas: null }), p({ vendas: 50 })]);
  assert.equal(r.resultados, 150);
});

test("ministério sem CPA calculável fica fora do ranking de eficiência", () => {
  const r = resumirCarteira([
    p({ ministryId: "m1", cpa: 80 }),
    p({ ministryId: "m2", cpa: null }),
  ]);
  assert.deepEqual(r.ranking.map((x) => x.ministryId), ["m1"]);
});

/* ------------------------------ ranking -------------------------------- */

test("ranking ordena por eficiência: menor custo por resultado primeiro", () => {
  const r = resumirCarteira([
    p({ ministryId: "caro", cpa: 200 }),
    p({ ministryId: "barato", cpa: 40 }),
    p({ ministryId: "medio", cpa: 90 }),
  ]);
  assert.deepEqual(r.ranking.map((x) => x.ministryId), ["barato", "medio", "caro"]);
});

test("CPA do ministério é mediana, não média — um outlier não domina", () => {
  const r = resumirCarteira([
    p({ ministryId: "m1", cpa: 50 }),
    p({ ministryId: "m1", cpa: 60 }),
    p({ ministryId: "m1", cpa: 1000 }),
  ]);
  assert.equal(r.ranking[0].cpaMediano, 60);
});

/* ---------------------------- comparação ------------------------------- */

test("variação de investimento compara com a janela anterior de mesma duração", () => {
  const perfis = [
    p({ id: "antigo", dataReferencia: "2026-02-15", investimento: 10000 }),
    p({ id: "novo", dataReferencia: "2026-05-15", investimento: 15000 }),
  ];
  const r = resumirCarteira(perfis, { inicio: "2026-04-01", fim: "2026-06-30" });
  assert.equal(r.investimento, 15000);
  assert.equal(r.investimentoAnterior, 10000);
  assert.equal(r.variacaoInvestimento, 50);
});

test("sem janela informada não há comparação de período", () => {
  const r = resumirCarteira([p({ investimento: 100 })]);
  assert.equal(r.variacaoInvestimento, null);
  assert.equal(r.investimentoAnterior, null);
});

/* --------------------------- leitura do cliente ------------------------ */

test("melhor evento usa resultados quando há rastreamento", () => {
  const l = lerMinisterio("m1", [
    p({ id: "a", nome: "Evento A", vendas: 100, alcance: 90000 }),
    p({ id: "b", nome: "Evento B", vendas: 300, alcance: 10000 }),
  ]);
  assert.equal(l.melhorEvento?.nome, "Evento B");
  assert.equal(l.melhorEvento?.rotulo, "resultados");
});

test("sem rastreamento, melhor evento cai para alcance", () => {
  const l = lerMinisterio("m1", [
    p({ id: "a", nome: "Evento A", vendas: null, alcance: 90000 }),
    p({ id: "b", nome: "Evento B", vendas: null, alcance: 10000 }),
  ]);
  assert.equal(l.melhorEvento?.nome, "Evento A");
  assert.equal(l.melhorEvento?.rotulo, "alcance");
});

test("sem resultado nem alcance, não elege melhor evento", () => {
  const l = lerMinisterio("m1", [p({ id: "a", nome: "A" }), p({ id: "b", nome: "B" })]);
  assert.equal(l.melhorEvento, null);
});

test("um evento só é marcado como base insuficiente", () => {
  assert.equal(lerMinisterio("m1", [p({ id: "a" })]).dadosInsuficientes, true);
  assert.equal(lerMinisterio("m1", [p({ id: "a" }), p({ id: "b" })]).dadosInsuficientes, false);
});

test("a referência de CPA exclui o próprio ministério", () => {
  const perfis = [
    p({ ministryId: "m1", cpa: 500 }),
    ...Array.from({ length: 5 }, (_, i) => p({ id: `o${i}`, ministryId: "m2", cpa: 50 + i })),
  ];
  const l = lerMinisterio("m1", perfis);
  // Se o próprio m1 entrasse na faixa, o máximo seria 500.
  assert.ok(l.cpaReferencia!.max < 100, `faixa contaminada: max ${l.cpaReferencia!.max}`);
  assert.equal(l.cpaReferencia!.n, 5);
});

test("série de resultados sai em ordem cronológica", () => {
  const l = lerMinisterio("m1", [
    p({ id: "c", nome: "Terceiro", dataReferencia: "2026-06-01", vendas: 30 }),
    p({ id: "a", nome: "Primeiro", dataReferencia: "2026-01-01", vendas: 10 }),
    p({ id: "b", nome: "Segundo", dataReferencia: "2026-03-01", vendas: 20 }),
  ]);
  assert.deepEqual(l.serieResultados.map((s) => s.nome), ["Primeiro", "Segundo", "Terceiro"]);
});
