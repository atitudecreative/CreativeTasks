// Testes da regra de status do sync do Asana.
//
// São a rede de segurança da decisão mais sensível do pipeline: é esta
// função que define em que estágio cada demanda aparece pro cliente.
// Rodam com o runner nativo do Node, sem dependência nova:
//
//   npm run test:asana-status

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizaSecao, secaoDaTarefa, resolveStatus, dataDe } from "./asana-status.mjs";

const MIN_A = "ministerio-a";
const MIN_B = "ministerio-b";

const statusMap = {
  global: new Map([
    ["em arte", "em_producao"],
    ["com o cliente", "aguardando_ministerio"],
    ["feito", "concluida"],
  ]),
  porMinisterio: new Map([
    // O ministério A chama de "Com o cliente" algo que, no fluxo dele,
    // quer dizer aguardando APROVAÇÃO formal.
    [MIN_A, new Map([["com o cliente", "aguardando_aprovacao"]])],
  ]),
};

function card(secao, projectGid = "P1", extra = {}) {
  return {
    completed: false,
    memberships: secao ? [{ project: { gid: projectGid }, section: { name: secao } }] : [],
    ...extra,
  };
}

/* ----------------------------- normalização ----------------------------- */

test("normaliza acento, caixa e espaço em volta", () => {
  assert.equal(normalizaSecao("Em Arte"), "em arte");
  assert.equal(normalizaSecao("  EM ARTE  "), "em arte");
  assert.equal(normalizaSecao("Revisão Interna"), "revisao interna");
  assert.equal(normalizaSecao("Aprovação"), "aprovacao");
  assert.equal(normalizaSecao("Solicitações"), "solicitacoes");
});

test("trata vazio e nulo sem explodir", () => {
  assert.equal(normalizaSecao(null), null);
  assert.equal(normalizaSecao(undefined), null);
  assert.equal(normalizaSecao(""), null);
  assert.equal(normalizaSecao("   "), null);
});

/* ------------------------------- seção ---------------------------------- */

test("pega a coluna do projeto sendo sincronizado, não de outro", () => {
  const task = {
    memberships: [
      { project: { gid: "OUTRO" }, section: { name: "Backlog" } },
      { project: { gid: "P1" }, section: { name: "Em arte" } },
    ],
  };
  assert.equal(secaoDaTarefa(task, "P1"), "Em arte");
  assert.equal(secaoDaTarefa(task, "OUTRO"), "Backlog");
});

test("subtarefa não tem coluna — devolve null em vez de chutar", () => {
  assert.equal(secaoDaTarefa({ memberships: [] }, "P1"), null);
  assert.equal(secaoDaTarefa({}, "P1"), null);
});

test("card num projeto que não é o sincronizado devolve null", () => {
  const task = { memberships: [{ project: { gid: "OUTRO" }, section: { name: "Feito" } }] };
  assert.equal(secaoDaTarefa(task, "P1"), null);
});

/* ------------------------------- status --------------------------------- */

test("concluído no Asana vence a coluna", () => {
  const t = card("Em arte", "P1", { completed: true });
  assert.equal(resolveStatus(t, "Em arte", MIN_A, statusMap), "concluida");
});

test("regra do ministério vence a global", () => {
  assert.equal(resolveStatus(card("Com o cliente"), "Com o cliente", MIN_A, statusMap), "aguardando_aprovacao");
});

test("ministério sem regra própria usa a global", () => {
  assert.equal(resolveStatus(card("Com o cliente"), "Com o cliente", MIN_B, statusMap), "aguardando_ministerio");
});

test("casa independente de acento e caixa", () => {
  assert.equal(resolveStatus(card("EM ARTE"), "EM ARTE", MIN_B, statusMap), "em_producao");
  assert.equal(resolveStatus(card(" Feito "), " Feito ", MIN_B, statusMap), "concluida");
});

test("coluna ainda não mapeada cai no comportamento antigo", () => {
  assert.equal(resolveStatus(card("Coluna Inventada"), "Coluna Inventada", MIN_B, statusMap), "em_producao");
});

test("sem coluna nenhuma (subtarefa) cai no comportamento antigo", () => {
  assert.equal(resolveStatus(card(null), null, MIN_B, statusMap), "em_producao");
});

test("de-para vazio preserva exatamente o comportamento anterior", () => {
  const vazio = { global: new Map(), porMinisterio: new Map() };
  assert.equal(resolveStatus({ completed: true }, "Feito", MIN_A, vazio), "concluida");
  assert.equal(resolveStatus({ completed: false }, "Feito", MIN_A, vazio), "em_producao");
});

/* -------------------------------- datas --------------------------------- */

test("extrai a data do timestamp do Asana", () => {
  assert.equal(dataDe("2026-03-14T18:22:31.000Z"), "2026-03-14");
  assert.equal(dataDe(null), null);
  assert.equal(dataDe(undefined), null);
});
