import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatCompact, formatMoney, formatMetric, formatPercent, percentChange, isInverted } from "./metricLanguage.ts";

/* A forma compacta é escrita à mão de propósito. O Intl resolveria em uma
   linha, mas a tabela de compactação vem do ICU, e o ICU do Node não é o
   do Chrome: para R$ 42.000 o servidor escrevia "R$ 42,0 mil" e o
   navegador "R$ 42 mil". Texto diferente entre os dois é erro de
   hidratação — o React joga fora o HTML que chegou pronto e refaz a
   árvore no cliente. Estes testes fixam a saída exata. */

describe("formatCompact()", () => {
  test("abaixo de 10 mil não compacta", () => {
    assert.equal(formatCompact(0), "0");
    assert.equal(formatCompact(999), "999");
    assert.equal(formatCompact(9999), "9.999");
  });

  test("milhar, milhão, bilhão", () => {
    assert.equal(formatCompact(10000), "10 mil");
    assert.equal(formatCompact(12641), "12,6 mil");
    assert.equal(formatCompact(42000), "42 mil");
    assert.equal(formatCompact(1284930), "1,3 mi");
    assert.equal(formatCompact(2_000_000_000), "2 bi");
  });

  test("decimal zero não aparece — é onde Node e Chrome discordavam", () => {
    assert.equal(formatCompact(42000), "42 mil");
    assert.equal(formatCompact(1_000_000), "1 mi");
  });

  test("negativo mantém o sinal e a escala", () => {
    assert.equal(formatCompact(-1284930), "-1,3 mi");
  });

  test("null e NaN viram travessão, não 'NaN'", () => {
    assert.equal(formatCompact(null), "—");
    assert.equal(formatCompact(undefined), "—");
    assert.equal(formatCompact(NaN), "—");
    assert.equal(formatCompact(Infinity), "—");
  });
});

describe("formatMoney()", () => {
  test("valor exato por padrão", () => {
    assert.equal(formatMoney(1284.5), "R$ 1.284,50");
  });

  test("compacto acima de 10 mil", () => {
    assert.equal(formatMoney(42000, true), "R$ 42 mil");
    assert.equal(formatMoney(1284930, true), "R$ 1,3 mi");
  });

  test("compacto abaixo do limite cai no formato normal sem centavos", () => {
    assert.equal(formatMoney(9999, true), "R$ 9.999");
  });

  test("zero é R$ 0, não travessão — zero é um dado", () => {
    assert.equal(formatMoney(0), "R$ 0,00");
  });

  test("sem valor é travessão", () => {
    assert.equal(formatMoney(null), "—");
    assert.equal(formatMoney(null, true), "—");
  });
});

describe("formatPercent() — vírgula, não ponto", () => {
  test("em pt-BR a casa decimal é vírgula", () => {
    assert.equal(formatPercent(3.004, 2), "3,00%");
    assert.equal(formatPercent(18.45, 1), "18,5%");
  });

  test("'auto' usa duas casas abaixo de 10 e uma acima", () => {
    assert.equal(formatPercent(3.004), "3,00%");
    assert.equal(formatPercent(42.37), "42,4%");
  });

  test("zero casas não deixa vírgula solta", () => {
    assert.equal(formatPercent(42.6, 0), "43%");
  });

  test("negativo mantém o sinal", () => {
    assert.equal(formatPercent(-16.66, 1), "-16,7%");
  });

  test("sem valor é travessão", () => {
    assert.equal(formatPercent(null), "—");
    assert.equal(formatPercent(NaN, 2), "—");
  });
});

describe("formatMetric()", () => {
  test("percentual sai em pt-BR", () => {
    assert.equal(formatMetric(3.004, "percent"), "3,00%");
    assert.equal(formatMetric(42.37, "percent"), "42,4%");
  });

  test("sem valor é travessão em qualquer formato", () => {
    for (const f of ["money", "money-precise", "percent", "decimal", "integer"] as const) {
      assert.equal(formatMetric(null, f), "—");
      assert.equal(formatMetric(NaN, f), "—");
    }
  });
});

describe("percentChange()", () => {
  test("variação simples", () => {
    assert.equal(percentChange(120, 100), 20);
    assert.equal(percentChange(80, 100), -20);
  });

  test("base zero não vira infinito", () => {
    assert.equal(percentChange(10, 0), null);
  });

  test("sem base não inventa comparação", () => {
    assert.equal(percentChange(10, null), null);
    assert.equal(percentChange(null, 10), null);
  });

  test("base negativa usa o módulo, então o sinal continua legível", () => {
    assert.equal(percentChange(-50, -100), 50);
  });
});

describe("isInverted()", () => {
  test("custo subindo é ruim", () => {
    assert.equal(isInverted("cpc"), true);
    assert.equal(isInverted("cpa"), true);
  });

  test("alcance subindo é bom", () => {
    assert.equal(isInverted("alcance"), false);
  });
});
