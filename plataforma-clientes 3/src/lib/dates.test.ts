import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  hoje, comoDataLocal, jaPassou, diasEntre, somaDias,
  formatarDiaMes, formatarDataCompleta, formatarMesPorExtenso, formatarMesCurto,
} from "./dates.ts";

describe("hoje() — o dia em Brasília, não o do servidor", () => {
  test("21h de Brasília ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC", () => {
    // 2026-03-16T00:30:00Z = 2026-03-15 21:30 em Brasília.
    assert.equal(hoje(new Date("2026-03-16T00:30:00Z")), "2026-03-15");
  });

  test("meia-noite e meia de Brasília já é o dia novo", () => {
    assert.equal(hoje(new Date("2026-03-16T03:30:00Z")), "2026-03-16");
  });

  test("meio-dia UTC cai no mesmo dia dos dois lados", () => {
    assert.equal(hoje(new Date("2026-03-15T12:00:00Z")), "2026-03-15");
  });
});

describe("comoDataLocal()", () => {
  test("data pura passa intacta", () => {
    assert.equal(comoDataLocal("2026-03-15"), "2026-03-15");
  });

  test("timestamp é convertido no fuso de Brasília, não em UTC", () => {
    // 23h30 UTC = 20h30 em Brasília, ainda dia 15.
    assert.equal(comoDataLocal("2026-03-15T23:30:00+00:00"), "2026-03-15");
    // 02h30 UTC = 23h30 do dia anterior em Brasília.
    assert.equal(comoDataLocal("2026-03-16T02:30:00+00:00"), "2026-03-15");
  });

  test("null e string inválida viram null", () => {
    assert.equal(comoDataLocal(null), null);
    assert.equal(comoDataLocal(""), null);
    assert.equal(comoDataLocal("nem data"), null);
  });
});

describe("jaPassou() — a definição de 'atrasada'", () => {
  test("prazo de hoje NÃO está atrasado", () => {
    assert.equal(jaPassou("2026-03-15", "2026-03-15"), false);
  });

  test("prazo de ontem está atrasado", () => {
    assert.equal(jaPassou("2026-03-14", "2026-03-15"), true);
  });

  test("prazo de amanhã não está atrasado", () => {
    assert.equal(jaPassou("2026-03-16", "2026-03-15"), false);
  });

  test("sem prazo nunca está atrasado", () => {
    assert.equal(jaPassou(null, "2026-03-15"), false);
    assert.equal(jaPassou(undefined, "2026-03-15"), false);
  });

  test("o bug de três horas: 21h de Brasília não antecipa o atraso", () => {
    const vinteEUmaHoraEmBrasilia = new Date("2026-03-16T00:30:00Z");
    const hojeReal = hoje(vinteEUmaHoraEmBrasilia);
    // Uma demanda que vence "hoje" (15) não pode estar atrasada às 21h do
    // dia 15 — que é exatamente quando o servidor em UTC já virou pro 16.
    assert.equal(jaPassou("2026-03-15", hojeReal), false);
  });
});

describe("diasEntre() e somaDias()", () => {
  test("dias corridos simples", () => {
    assert.equal(diasEntre("2026-03-01", "2026-03-15"), 14);
    assert.equal(diasEntre("2026-03-15", "2026-03-01"), -14);
    assert.equal(diasEntre("2026-03-15", "2026-03-15"), 0);
  });

  test("atravessa mês e ano", () => {
    assert.equal(diasEntre("2025-12-31", "2026-01-01"), 1);
    assert.equal(diasEntre("2026-02-28", "2026-03-01"), 1); // 2026 não é bissexto
    assert.equal(diasEntre("2024-02-28", "2024-03-01"), 2); // 2024 é
  });

  test("somaDias é o inverso de diasEntre", () => {
    assert.equal(somaDias("2026-03-15", 10), "2026-03-25");
    assert.equal(somaDias("2026-03-15", -20), "2026-02-23");
    assert.equal(somaDias("2025-12-31", 1), "2026-01-01");
    assert.equal(diasEntre("2026-03-15", somaDias("2026-03-15", 91)), 91);
  });

  test("atravessa o horário de verão sem perder nem ganhar dia", () => {
    // Brasil não tem mais horário de verão, mas a conta é feita ao
    // meio-dia justamente pra não depender disso.
    assert.equal(diasEntre("2018-10-01", "2018-12-01"), 61);
    assert.equal(somaDias("2018-10-01", 61), "2018-12-01");
  });
});

describe("formatação", () => {
  test("dia 1 não vira dia 30 do mês anterior", () => {
    // O erro clássico: formatar "2026-03-01" no fuso local de um servidor
    // atrás de UTC mostra 28/02.
    assert.match(formatarDiaMes("2026-03-01"), /^01/);
    assert.equal(formatarDataCompleta("2026-03-01"), "01/03/2026");
  });

  test("timestamp usa o dia de Brasília", () => {
    assert.equal(formatarDataCompleta("2026-03-16T02:00:00+00:00"), "15/03/2026");
  });

  test("vazio tem texto próprio", () => {
    assert.equal(formatarDiaMes(null), "sem prazo");
    assert.equal(formatarDiaMes(null, "—"), "—");
    assert.equal(formatarDataCompleta(null), "—");
  });

  test("mês por extenso e curto", () => {
    assert.equal(formatarMesPorExtenso("2026-03"), "Março de 2026");
    assert.equal(formatarMesCurto("2026-03"), "Mar/26");
    assert.equal(formatarMesCurto("2026-01"), "Jan/26");
  });
});
