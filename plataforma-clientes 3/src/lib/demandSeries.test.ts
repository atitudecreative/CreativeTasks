import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { agruparPorMesEEstagio } from "./demandSeries.ts";

/* Este módulo existe separado do componente que o desenha por uma regra do
   React Server Components que não perdoa: função exportada de um arquivo
   "use client" NÃO é a função quando um Server Component a importa — é uma
   referência ao cliente. O Início chamava exatamente isso e a página
   inteira caía com "N is not a function", sem nenhuma pista em produção.
   Aqui ele é puro, e testável. */

const d = (prazo: string | null, stage: Parameters<typeof agruparPorMesEEstagio>[0][number]["stage"]) => ({
  prazo,
  stage,
});

describe("agruparPorMesEEstagio()", () => {
  test("agrupa por mês de prazo e soma por estágio", () => {
    const r = agruparPorMesEEstagio(
      [
        d("2026-03-04", "fila"),
        d("2026-03-20", "fila"),
        d("2026-03-31", "concluida"),
      ],
      "2026-03"
    );
    assert.equal(r.length, 1);
    assert.equal(r[0].chave, "2026-03");
    assert.equal(r[0].total, 3);
    assert.equal(r[0].porEstagio.fila, 2);
    assert.equal(r[0].porEstagio.concluida, 1);
  });

  test("preenche mês vazio no meio do intervalo", () => {
    const r = agruparPorMesEEstagio([d("2026-01-10", "fila"), d("2026-04-10", "fila")], "2026-02");
    assert.deepEqual(r.map((c) => c.chave), ["2026-01", "2026-02", "2026-03", "2026-04"]);
    assert.deepEqual(r.map((c) => c.total), [1, 0, 0, 1]);
  });

  test("demanda sem prazo fica de fora — não vira um mês inventado", () => {
    const r = agruparPorMesEEstagio([d(null, "fila"), d("2026-05-01", "producao")], "2026-05");
    assert.equal(r.length, 1);
    assert.equal(r[0].total, 1);
  });

  test("nada com prazo devolve série vazia, não uma coluna de zero", () => {
    assert.deepEqual(agruparPorMesEEstagio([d(null, "fila")], "2026-05"), []);
    assert.deepEqual(agruparPorMesEEstagio([], "2026-05"), []);
  });

  test("marca o mês em curso e os futuros", () => {
    const r = agruparPorMesEEstagio(
      [d("2026-02-01", "fila"), d("2026-03-01", "fila"), d("2026-04-01", "fila")],
      "2026-03"
    );
    assert.deepEqual(r.map((c) => [c.emCurso, c.futuro]), [
      [false, false],
      [true, false],
      [false, true],
    ]);
  });

  test("atravessa a virada de ano", () => {
    const r = agruparPorMesEEstagio([d("2025-11-10", "fila"), d("2026-02-10", "fila")], "2026-01");
    assert.deepEqual(r.map((c) => c.chave), ["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  test("prazo absurdo não gera milhares de colunas", () => {
    const r = agruparPorMesEEstagio([d("2026-01-01", "fila"), d("2205-01-01", "fila")], "2026-01");
    assert.equal(r.length, 120);
  });

  test("o total de cada coluna é a soma dos estágios dela", () => {
    const r = agruparPorMesEEstagio(
      [
        d("2026-06-01", "fila"),
        d("2026-06-02", "producao"),
        d("2026-06-03", "ministerio"),
        d("2026-06-04", "concluida"),
        d("2026-06-05", "parada"),
      ],
      "2026-06"
    );
    const c = r[0];
    const soma = Object.values(c.porEstagio).reduce((s, v) => s + v, 0);
    assert.equal(c.total, soma);
    assert.equal(c.total, 5);
  });
});
