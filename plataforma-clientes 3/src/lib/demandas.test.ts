import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { countByStage, STAGE_OF_STATUS, stageOf } from "./demandStages.ts";

/* Estes testes existem por causa de um defeito concreto: a tela de Início
   mostrava uma barra dizendo "Concluída 6" e, dois centímetros abaixo, o
   número "Concluídas 2". Eram duas contagens com definições diferentes de
   pronto, no mesmo painel. O resumo passou a sair da mesma tabela de
   estágios da barra — e aqui fica a garantia de que as duas não voltam a
   divergir.

   summarizeDemands mora em lib/data/demands.ts, que importa o cliente do
   Supabase (next/headers) e por isso não roda no runner de testes. A regra
   que interessa, porém, é a tabela de estágios, e ela é pura: testar a
   tabela cobre o resumo, que é derivado dela. */

const TODOS_OS_STATUS = Object.keys(STAGE_OF_STATUS);

describe("estágios — a definição única de 'em que pé está'", () => {
  test("os 14 status estão todos mapeados", () => {
    assert.equal(TODOS_OS_STATUS.length, 14);
  });

  test("status desconhecido cai na fila, não some da contagem", () => {
    assert.equal(stageOf("status_que_nao_existe"), "fila");
    const contagem = countByStage(["status_que_nao_existe"]);
    assert.equal(contagem.reduce((s, c) => s + c.count, 0), 1);
  });

  test("a soma dos estágios é sempre o total, sem demanda perdida", () => {
    const contagem = countByStage(TODOS_OS_STATUS);
    assert.equal(contagem.reduce((s, c) => s + c.count, 0), TODOS_OS_STATUS.length);
  });

  test("'concluída' abrange aprovada, publicada e concluída", () => {
    assert.equal(stageOf("aprovada"), "concluida");
    assert.equal(stageOf("agendada_ou_publicada"), "concluida");
    assert.equal(stageOf("concluida"), "concluida");
  });

  test("'com o ministério' é a bola do lado do cliente", () => {
    assert.equal(stageOf("aguardando_ministerio"), "ministerio");
    assert.equal(stageOf("aguardando_aprovacao"), "ministerio");
    assert.equal(stageOf("ajustes_solicitados"), "ministerio");
  });

  test("cancelada é parada, não concluída — não entra em taxa de conclusão", () => {
    assert.equal(stageOf("cancelada"), "parada");
    assert.equal(stageOf("pausada"), "parada");
  });

  test("em andamento + concluída + parada cobre os 14, sem sobreposição", () => {
    const emAndamento = TODOS_OS_STATUS.filter((s) =>
      ["fila", "producao", "ministerio"].includes(stageOf(s))
    );
    const concluidas = TODOS_OS_STATUS.filter((s) => stageOf(s) === "concluida");
    const paradas = TODOS_OS_STATUS.filter((s) => stageOf(s) === "parada");
    assert.equal(emAndamento.length + concluidas.length + paradas.length, 14);
    // Nenhum status em dois grupos.
    const juntos = [...emAndamento, ...concluidas, ...paradas];
    assert.equal(new Set(juntos).size, juntos.length);
  });

  test("estágio zerado não vira segmento de largura zero na barra", () => {
    const contagem = countByStage(["em_producao", "em_producao"]);
    assert.deepEqual(contagem.map((c) => c.key), ["producao"]);
  });

  test("a barra sai na ordem do fluxo, não por tamanho", () => {
    const contagem = countByStage([
      "concluida", "concluida", "concluida",
      "recebida",
      "aguardando_ministerio", "aguardando_ministerio",
      "em_producao",
    ]);
    assert.deepEqual(contagem.map((c) => c.key), ["fila", "producao", "ministerio", "concluida"]);
  });
});
