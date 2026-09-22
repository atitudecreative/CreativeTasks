import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { lerDinheiro, periodoInvalido } from "./numeros.ts";

const valor = (bruto: unknown) => {
  const r = lerDinheiro(bruto);
  return r.ok ? r.valor : `ERRO: ${r.motivo}`;
};

describe("lerDinheiro()", () => {
  test("o caso que motivou o arquivo: 1.234,56 virava null", () => {
    // Number("1.234,56".replace(",", ".")) === NaN, e o campo era salvo vazio.
    assert.equal(valor("1.234,56"), 1234.56);
  });

  test("aceita os formatos que uma pessoa realmente digita", () => {
    assert.equal(valor("1234.56"), 1234.56);
    assert.equal(valor("1234,56"), 1234.56);
    assert.equal(valor("1.234,56"), 1234.56);
    assert.equal(valor("1.234.567,89"), 1234567.89);
    assert.equal(valor("R$ 1.234,56"), 1234.56);
    assert.equal(valor("  42  "), 42);
  });

  test("milhar em pt-BR sem decimais não vira 1,234", () => {
    assert.equal(valor("1.234"), 1234);
    assert.equal(valor("12.000"), 12000);
    assert.equal(valor("1.234.567"), 1234567);
  });

  test("decimal com ponto e sem milhar continua decimal", () => {
    assert.equal(valor("1.5"), 1.5);
    assert.equal(valor("0.99"), 0.99);
    assert.equal(valor("1234.5"), 1234.5);
  });

  test("formato en-US também passa", () => {
    assert.equal(valor("1,234.56"), 1234.56);
  });

  test("espaço não separável de um copiar-e-colar não atrapalha", () => {
    assert.equal(valor("R$ 1.284,50"), 1284.5);
  });

  test("campo em branco é ausência, não erro — é diferente de zero", () => {
    assert.deepEqual(lerDinheiro(""), { ok: true, valor: null });
    assert.deepEqual(lerDinheiro(null), { ok: true, valor: null });
    assert.deepEqual(lerDinheiro("   "), { ok: true, valor: null });
    assert.deepEqual(lerDinheiro("0"), { ok: true, valor: 0 });
  });

  test("texto que não é número é recusado, não engolido", () => {
    for (const ruim of ["abc", "1.2.3,4,5", "--5", "1e9x", "-"]) {
      const r = lerDinheiro(ruim);
      assert.equal(r.ok, false, `deveria recusar ${JSON.stringify(ruim)}`);
    }
  });

  test("negativo é recusado com motivo próprio", () => {
    const r = lerDinheiro("-500");
    assert.equal(r.ok, false);
    assert.match(r.ok === false ? r.motivo : "", /negativo/i);
  });

  test("arredonda para centavos", () => {
    assert.equal(valor("10,005"), 10.01);
    assert.equal(valor("10,004"), 10);
  });
});

describe("periodoInvalido()", () => {
  test("início depois do término é recusado", () => {
    assert.match(periodoInvalido("2026-10-01", "2026-09-01") ?? "", /início/i);
  });

  test("ordem correta passa, inclusive no mesmo dia", () => {
    assert.equal(periodoInvalido("2026-09-01", "2026-10-01"), null);
    assert.equal(periodoInvalido("2026-09-01", "2026-09-01"), null);
  });

  test("data faltando não é erro — campanha é cadastrada antes de ter término", () => {
    assert.equal(periodoInvalido(null, "2026-10-01"), null);
    assert.equal(periodoInvalido("2026-09-01", null), null);
    assert.equal(periodoInvalido(null, null), null);
  });
});
