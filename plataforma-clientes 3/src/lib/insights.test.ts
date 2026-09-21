// Testes do motor de insights.
//
// Estas regras decidem o que a plataforma AFIRMA sobre o resultado de um
// evento na frente do cliente. Errar aqui não é um bug visual — é uma
// conclusão falsa numa prestação de contas. Por isso cada regra tem teste,
// e vários deles verificam justamente que a regra NÃO dispara quando falta
// base.
//
//   npm run test:insights

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  percentil,
  calcularFaixa,
  variacao,
  comparaveis,
  historicoDoMinisterio,
  gerarInsights,
  MIN_AMOSTRA_FAIXA,
  type CampanhaPerfil,
} from "./insights.ts";

/* --------------------------------------------------------------------- */

function perfil(over: Partial<CampanhaPerfil> = {}): CampanhaPerfil {
  return {
    id: "c0",
    ministryId: "m1",
    nome: "Campanha",
    tipo: "evento",
    fase: "monitoramento",
    saude: "no_caminho",
    dataReferencia: "2026-06-01",
    orcamentoPlanejado: null,
    orcamentoAprovado: null,
    investimento: null,
    alcance: null,
    impressoes: null,
    cliques: null,
    vendas: null,
    ctr: null,
    cpc: null,
    cpm: null,
    cpa: null,
    demandasTotal: 0,
    demandasConcluidas: 0,
    demandasComPrazoAferivel: 0,
    demandasNoPrazo: 0,
    cicloMedianoDias: null,
    entregasTotal: 0,
    progressoMarcos: null,
    ...over,
  };
}

/** n campanhas do mesmo tipo com um CPA fixo, pra formar uma faixa. */
function pares(n: number, over: (i: number) => Partial<CampanhaPerfil>): CampanhaPerfil[] {
  return Array.from({ length: n }, (_, i) => perfil({ id: `p${i}`, ...over(i) }));
}

const idDe = (r: ReturnType<typeof gerarInsights>) => r.insights.map((i) => i.id);

/* ============================== estatística ============================= */

test("percentil interpola igual ao percentile_cont do Postgres", () => {
  const v = [10, 20, 30, 40];
  assert.equal(percentil(v, 0.5), 25);
  assert.equal(percentil(v, 0.25), 17.5);
  assert.equal(percentil(v, 0.75), 32.5);
  assert.equal(percentil([7], 0.5), 7);
});

test("faixa exige amostra mínima — abaixo disso devolve null", () => {
  assert.equal(calcularFaixa([1, 2, 3]), null);
  assert.notEqual(calcularFaixa([1, 2, 3, 4]), null);
  assert.equal(MIN_AMOSTRA_FAIXA, 4);
});

test("faixa ignora nulo e valor não finito em vez de tratar como zero", () => {
  const f = calcularFaixa([10, null, 20, undefined, 30, NaN, 40]);
  assert.equal(f?.n, 4);
  assert.equal(f?.mediana, 25);
});

test("variação devolve null sem base, em vez de dividir por zero", () => {
  assert.equal(variacao(10, 0), null);
  assert.equal(variacao(10, null), null);
  assert.equal(variacao(null, 10), null);
  assert.equal(variacao(150, 100), 50);
  assert.equal(variacao(50, 100), -50);
});

/* ============================== seleção ================================ */

test("comparáveis são do mesmo tipo e nunca incluem a própria campanha", () => {
  const alvo = perfil({ id: "alvo", tipo: "evento" });
  const universo = [
    alvo,
    perfil({ id: "a", tipo: "evento" }),
    perfil({ id: "b", tipo: "campanha" }),
    perfil({ id: "c", tipo: "evento" }),
  ];
  const r = comparaveis(alvo, universo);
  assert.deepEqual(r.map((c) => c.id), ["a", "c"]);
});

test("histórico traz só campanhas anteriores do mesmo ministério, da mais recente", () => {
  const alvo = perfil({ id: "alvo", ministryId: "m1", dataReferencia: "2026-06-01" });
  const universo = [
    alvo,
    perfil({ id: "antiga", ministryId: "m1", dataReferencia: "2026-01-01" }),
    perfil({ id: "recente", ministryId: "m1", dataReferencia: "2026-05-01" }),
    perfil({ id: "futura", ministryId: "m1", dataReferencia: "2026-09-01" }),
    perfil({ id: "outro-min", ministryId: "m2", dataReferencia: "2026-05-01" }),
    perfil({ id: "sem-data", ministryId: "m1", dataReferencia: null }),
  ];
  assert.deepEqual(historicoDoMinisterio(alvo, universo).map((c) => c.id), ["recente", "antiga"]);
});

/* ============================ não inventar ============================= */

test("campanha sem dado nenhum não gera insight e é marcada como sem base", () => {
  const r = gerarInsights(perfil({ id: "alvo" }), [perfil({ id: "alvo" })]);
  assert.deepEqual(r.insights, []);
  assert.equal(r.dadosInsuficientes, true);
});

test("com poucos comparáveis, nenhuma comparação de quartil é afirmada", () => {
  const alvo = perfil({ id: "alvo", cpa: 10 });
  const universo = [alvo, ...pares(3, () => ({ cpa: 100 }))];
  const r = gerarInsights(alvo, universo);
  // CPA dez vezes melhor, mas só 3 comparáveis: não afirma nada.
  assert.equal(r.insights.filter((i) => i.id.startsWith("quartil")).length, 0);
});

test("todo insight comparativo carrega o tamanho da amostra", () => {
  const alvo = perfil({ id: "alvo", cpa: 10 });
  const universo = [alvo, ...pares(6, () => ({ cpa: 100 }))];
  for (const i of gerarInsights(alvo, universo).insights) {
    if (i.referencia) assert.ok((i.baseAmostra ?? 0) > 0, `${i.id} sem baseAmostra`);
  }
});

/* ============================== quartil ================================ */

test("CPA bem abaixo da faixa vira oportunidade (custo menor é melhor)", () => {
  const alvo = perfil({ id: "alvo", cpa: 10 });
  const universo = [alvo, ...pares(6, (i) => ({ cpa: 90 + i * 5 }))];
  const i = gerarInsights(alvo, universo).insights.find((x) => x.id === "quartil-cpa");
  assert.ok(i, "esperava insight de CPA");
  assert.equal(i!.severidade, "positivo");
  assert.equal(i!.baseAmostra, 6);
});

test("CPA bem acima da faixa vira alerta", () => {
  const alvo = perfil({ id: "alvo", cpa: 500 });
  const universo = [alvo, ...pares(6, (i) => ({ cpa: 90 + i * 5 }))];
  const i = gerarInsights(alvo, universo).insights.find((x) => x.id === "quartil-cpa");
  assert.equal(i?.severidade, "atencao");
});

test("CTR alto é bom (maior é melhor) — direção não se confunde com a de custo", () => {
  const alvo = perfil({ id: "alvo", ctr: 9 });
  const universo = [alvo, ...pares(6, (i) => ({ ctr: 1 + i * 0.1 }))];
  const i = gerarInsights(alvo, universo).insights.find((x) => x.id === "quartil-ctr");
  assert.equal(i?.severidade, "positivo");
});

test("valor dentro da faixa usual não vira insight", () => {
  const alvo = perfil({ id: "alvo", cpa: 100 });
  const universo = [alvo, ...pares(6, (i) => ({ cpa: 80 + i * 8 }))];
  assert.equal(idDe(gerarInsights(alvo, universo)).includes("quartil-cpa"), false);
});

/* ============================== anomalia =============================== */

test("verba cresce muito e retorno não acompanha vira anomalia", () => {
  const anterior = perfil({ id: "ant", nome: "Edição anterior", dataReferencia: "2026-01-01", investimento: 10000, vendas: 100 });
  const alvo = perfil({ id: "alvo", dataReferencia: "2026-06-01", investimento: 13500, vendas: 104 });
  const i = gerarInsights(alvo, [alvo, anterior]).insights.find((x) => x.id === "anomalia-investimento-retorno");
  assert.ok(i);
  assert.equal(i!.tipo, "anomalia");
  assert.match(i!.descricao, /Edição anterior/);
});

test("verba cresce e retorno acompanha NÃO é anomalia", () => {
  const anterior = perfil({ id: "ant", dataReferencia: "2026-01-01", investimento: 10000, vendas: 100 });
  const alvo = perfil({ id: "alvo", dataReferencia: "2026-06-01", investimento: 13000, vendas: 135 });
  assert.equal(idDe(gerarInsights(alvo, [alvo, anterior])).includes("anomalia-investimento-retorno"), false);
});

test("gastar menos mantendo resultado vira eficiência", () => {
  const anterior = perfil({ id: "ant", nome: "Anterior", dataReferencia: "2026-01-01", investimento: 10000, vendas: 100 });
  const alvo = perfil({ id: "alvo", dataReferencia: "2026-06-01", investimento: 8000, vendas: 102 });
  const i = gerarInsights(alvo, [alvo, anterior]).insights.find((x) => x.id === "eficiencia-investimento-retorno");
  assert.equal(i?.severidade, "positivo");
});

test("sem rastreamento de conversão (vendas null) a anomalia não é afirmada", () => {
  const anterior = perfil({ id: "ant", dataReferencia: "2026-01-01", investimento: 10000, vendas: null });
  const alvo = perfil({ id: "alvo", dataReferencia: "2026-06-01", investimento: 20000, vendas: null });
  assert.equal(idDe(gerarInsights(alvo, [alvo, anterior])).includes("anomalia-investimento-retorno"), false);
});

/* ============================== orçamento ============================== */

test("estouro de orçamento é apontado com o valor excedido", () => {
  const alvo = perfil({ id: "alvo", orcamentoAprovado: 10000, investimento: 13000 });
  const i = gerarInsights(alvo, [alvo]).insights.find((x) => x.id === "orcamento-estouro");
  assert.ok(i);
  assert.equal(i!.severidade, "critico");
  assert.match(i!.descricao, /30%/);
});

test("usar 60% da verba no meio da campanha não é achado", () => {
  const alvo = perfil({ id: "alvo", saude: "no_caminho", orcamentoAprovado: 10000, investimento: 6000 });
  assert.equal(idDe(gerarInsights(alvo, [alvo])).includes("orcamento-sobra"), false);
});

test("sobra de verba só aparece com a campanha encerrada", () => {
  const alvo = perfil({ id: "alvo", saude: "concluida", orcamentoAprovado: 10000, investimento: 6000 });
  assert.ok(idDe(gerarInsights(alvo, [alvo])).includes("orcamento-sobra"));
});

/* ============================== tendência ============================== */

test("crescimento estritamente crescente em 3+ eventos vira tendência", () => {
  const a = perfil({ id: "a", dataReferencia: "2026-01-01", vendas: 50 });
  const b = perfil({ id: "b", dataReferencia: "2026-03-01", vendas: 80 });
  const alvo = perfil({ id: "alvo", dataReferencia: "2026-06-01", vendas: 120 });
  const i = gerarInsights(alvo, [alvo, a, b]).insights.find((x) => x.id === "tendencia-crescimento");
  assert.ok(i);
  assert.equal(i!.baseAmostra, 3);
});

test("série que oscila NÃO é chamada de tendência", () => {
  const a = perfil({ id: "a", dataReferencia: "2026-01-01", vendas: 50 });
  const b = perfil({ id: "b", dataReferencia: "2026-03-01", vendas: 130 });
  const alvo = perfil({ id: "alvo", dataReferencia: "2026-06-01", vendas: 120 });
  assert.equal(idDe(gerarInsights(alvo, [alvo, a, b])).includes("tendencia-crescimento"), false);
});

/* =============================== recorde =============================== */

test("melhor marca do ministério é apontada como recorde", () => {
  const a = perfil({ id: "a", dataReferencia: "2026-01-01", vendas: 50 });
  const b = perfil({ id: "b", dataReferencia: "2026-03-01", vendas: 90 });
  const alvo = perfil({ id: "alvo", dataReferencia: "2026-06-01", vendas: 200 });
  const i = gerarInsights(alvo, [alvo, a, b]).insights.find((x) => x.id === "recorde-vendas");
  assert.ok(i);
  assert.match(i!.descricao, /90/);
});

test("primeiro evento do ministério não vira recorde", () => {
  const alvo = perfil({ id: "alvo", vendas: 200 });
  assert.equal(gerarInsights(alvo, [alvo]).insights.some((i) => i.id.startsWith("recorde")), false);
});

/* ============================= pontualidade ============================ */

test("pontualidade exige massa mínima de demandas com prazo", () => {
  const alvo = perfil({ id: "alvo", demandasComPrazoAferivel: 3, demandasNoPrazo: 0 });
  assert.equal(gerarInsights(alvo, [alvo]).insights.some((i) => i.id.startsWith("pontualidade")), false);
});

test("pontualidade muito baixa é apontada mesmo sem grupo de comparação", () => {
  const alvo = perfil({ id: "alvo", demandasComPrazoAferivel: 20, demandasNoPrazo: 6 });
  const i = gerarInsights(alvo, [alvo]).insights.find((x) => x.id === "pontualidade-baixa");
  assert.ok(i);
  assert.equal(i!.baseAmostra, null);
});

/* =============================== ordenação ============================= */

test("crítico vem antes de atenção, que vem antes de positivo", () => {
  const anterior = perfil({ id: "ant", nome: "Anterior", dataReferencia: "2026-01-01", investimento: 10000, vendas: 100 });
  const alvo = perfil({
    id: "alvo",
    dataReferencia: "2026-06-01",
    orcamentoAprovado: 10000,
    investimento: 14000,
    vendas: 101,
    ctr: 9,
  });
  const universo = [alvo, anterior, ...pares(6, (i) => ({ ctr: 1 + i * 0.1 }))];
  const sev = gerarInsights(alvo, universo).insights.map((i) => i.severidade);
  const ordem = { critico: 0, atencao: 1, positivo: 2, neutro: 3 } as const;
  for (let i = 1; i < sev.length; i++) {
    assert.ok(ordem[sev[i - 1]] <= ordem[sev[i]], `fora de ordem: ${sev.join(", ")}`);
  }
});
