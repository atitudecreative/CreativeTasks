// Testes dos resultados por período do Início.
//
//   node --test src/lib/resultados.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agregar, contarNoPeriodo, janelaDoPeriodo, lerPeriodo, manchete, resultadoDoPeriodo,
} from "./resultados.ts";
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

test("período desconhecido na URL cai no padrão, sem quebrar", () => {
  assert.equal(lerPeriodo("90d"), "90d");
  assert.equal(lerPeriodo(["180d"]), "180d");
  assert.equal(lerPeriodo("drop table"), "12m");
  assert.equal(lerPeriodo(undefined), "12m");
});

test("janela de 90 dias tem 90 dias e a anterior também", () => {
  const j = janelaDoPeriodo("90d", "2026-09-28");
  assert.equal(j.inicio, "2026-07-01");
  assert.equal(j.anterior!.fim, "2026-07-01");
  assert.equal(j.anterior!.inicio, "2026-04-02");
  const dias = (a: string, b: string) =>
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000;
  assert.equal(dias(j.anterior!.inicio, j.anterior!.fim), 90);
});

test("'tudo' não tem período anterior nem variação", () => {
  const r = resultadoDoPeriodo([p({ investimento: 100 })], "tudo", "2026-09-28");
  assert.equal(r.anterior, null);
  assert.equal(r.variacao.investimento, null);
  assert.equal(r.atual.investimento, 100);
});

test("campanha com evento no futuro entra no período atual", () => {
  // Campanha em andamento: está gastando agora, e o evento é daqui a 20 dias.
  const r = resultadoDoPeriodo([p({ dataReferencia: "2026-10-18", investimento: 500 })], "90d", "2026-09-28");
  assert.equal(r.atual.eventos, 1);
  assert.equal(r.atual.investimento, 500);
});

test("sem rastreamento, resultados é null e não zero", () => {
  const a = agregar([p({ investimento: 100 }), p({ investimento: 200 })]);
  assert.equal(a.resultados, null);
  assert.equal(a.custoPorResultado, null);
  assert.equal(a.alcance, null);
  assert.equal(a.comMidia, 0);
});

test("custo por resultado vem do agregado, não da média dos CPAs", () => {
  // CPA 2 (200/100) e CPA 100 (1000/10). Média dos CPAs = 51; o certo é
  // 1200 / 110 ≈ 10,9.
  const a = agregar([
    p({ investimento: 200, vendas: 100 }),
    p({ investimento: 1000, vendas: 10 }),
    p({ investimento: 5000 }), // sem rastreamento: não entra no custo
  ]);
  assert.ok(Math.abs(a.custoPorResultado! - 1200 / 110) < 1e-9);
  assert.equal(a.investimento, 6200);
});

test("variação contra o período anterior de mesma duração", () => {
  const r = resultadoDoPeriodo(
    [
      p({ id: "a", dataReferencia: "2026-08-10", investimento: 150, vendas: 30 }),
      p({ id: "b", dataReferencia: "2026-05-10", investimento: 100, vendas: 20 }),
      p({ id: "c", dataReferencia: "2025-01-01", investimento: 9999 }), // fora das duas janelas
    ],
    "90d",
    "2026-09-28"
  );
  assert.equal(r.atual.eventos, 1);
  assert.equal(r.anterior!.eventos, 1);
  assert.equal(r.variacao.investimento, 50);
  assert.equal(r.variacao.resultados, 50);
  assert.equal(r.variacao.custoPorResultado, 0);
});

test("sem evento no período anterior, não há seta", () => {
  const r = resultadoDoPeriodo([p({ dataReferencia: "2026-09-01", investimento: 100 })], "90d", "2026-09-28");
  assert.equal(r.anterior!.eventos, 0);
  assert.equal(r.variacao.investimento, null);
});

test("campanhas do recorte vêm da mais recente para a mais antiga", () => {
  const r = resultadoDoPeriodo(
    [p({ id: "velha", dataReferencia: "2026-07-05" }), p({ id: "nova", dataReferencia: "2026-09-20" })],
    "90d",
    "2026-09-28"
  );
  assert.deepEqual(r.campanhas.map((c) => c.id), ["nova", "velha"]);
});

test("contagem por data respeita as duas janelas", () => {
  const j = janelaDoPeriodo("90d", "2026-09-28");
  const c = contarNoPeriodo(["2026-09-01", "2026-08-01", "2026-05-01", null, "2025-01-01"], j);
  assert.equal(c.atual, 2);
  assert.equal(c.anterior, 1);
  assert.equal(c.variacao, 100);
});

function comVariacao(vr: number | null, vi: number | null) {
  const r = resultadoDoPeriodo([], "90d", "2026-09-28");
  return { ...r, variacao: { ...r.variacao, resultados: vr, investimento: vi } };
}

test("manchete só sai quando as duas variações existem", () => {
  assert.equal(manchete(comVariacao(null, 10), "aos 3 meses anteriores"), null);
  assert.equal(manchete(comVariacao(10, null), "aos 3 meses anteriores"), null);
});

test("manchete: mais resultado com a mesma verba", () => {
  const m = manchete(comVariacao(18.4, 2), "aos 3 meses anteriores")!;
  assert.match(m, /cresceram 18%/);
  assert.match(m, /praticamente igual/);
  assert.match(m, /mais retorno por real/);
});

test("manchete: verba subiu e retorno não acompanhou", () => {
  const m = manchete(comVariacao(-3, 40), "aos 3 meses anteriores")!;
  assert.match(m, /estáveis/);
  assert.match(m, /40% maior/);
  assert.match(m, /sem o retorno acompanhar/);
});
