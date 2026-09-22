import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizar } from "./texto.ts";

describe("normalizar() — a base de toda busca da plataforma", () => {
  test("tira acento", () => {
    assert.equal(normalizar("Comunicação"), "comunicacao");
    assert.equal(normalizar("Revisão Interna"), "revisao interna");
    assert.equal(normalizar("ÁÉÍÓÚ àèìòù âêîôû ãõ ç ñ ü"), "aeiou aeiou aeiou ao c n u");
  });

  test("baixa a caixa e apara as pontas", () => {
    assert.equal(normalizar("  FESTA DA ROÇA  "), "festa da roca");
  });

  test("não mexe no que não tem acento", () => {
    assert.equal(normalizar("Meta Ads 2026"), "meta ads 2026");
  });

  test("string vazia continua vazia", () => {
    assert.equal(normalizar(""), "");
    assert.equal(normalizar("   "), "");
  });

  test("é o que faz a busca por 'campanha' achar 'Campanhã'", () => {
    const acervo = ["Campanhã de Natal", "Culto de Páscoa", "Retiro de Jovens"];
    const achados = acervo.filter((t) => normalizar(t).includes(normalizar("CAMPANHA")));
    assert.deepEqual(achados, ["Campanhã de Natal"]);
  });

  test("a faixa de acentos escapada cobre a mesma coisa que a literal", () => {
    // Proteção contra o risco que motivou o arquivo: se alguém trocar
    // ̀-ͯ por outra faixa, estes combinantes param de sumir.
    const combinantes = "̧̀́̂̃̈ͯ";
    assert.equal(normalizar(`a${combinantes}`), "a");
  });
});
