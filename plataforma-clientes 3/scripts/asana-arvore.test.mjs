import test from "node:test";
import assert from "node:assert/strict";
import { raizesDoQuadro, montarArvore } from "./asana-arvore.mjs";

const tarefa = (gid, extra = {}) => ({ gid, name: `tarefa ${gid}`, ...extra });

test("tarefa sem pai é raiz de topo", () => {
  const { topo, orfas } = raizesDoQuadro([tarefa("1"), tarefa("2")]);
  assert.deepEqual(topo.map((t) => t.gid), ["1", "2"]);
  assert.deepEqual(orfas, []);
});

test("subtarefa cujo pai está no mesmo quadro NÃO vira raiz (entra pelo pai)", () => {
  const { topo, orfas } = raizesDoQuadro([tarefa("1"), tarefa("2", { parent: { gid: "1" } })]);
  assert.deepEqual(topo.map((t) => t.gid), ["1"]);
  assert.deepEqual(orfas, []);
});

test("subtarefa cujo pai NÃO está no quadro vira raiz — era o caso que sumia", () => {
  const { topo, orfas } = raizesDoQuadro([
    tarefa("1"),
    tarefa("99", { parent: { gid: "fora-do-projeto" } }),
  ]);
  assert.deepEqual(topo.map((t) => t.gid), ["1"]);
  assert.deepEqual(orfas.map((t) => t.gid), ["99"]);
});

test("a árvore desce pelas subtarefas e guarda o pai de cada uma", async () => {
  const filhas = new Map([
    ["1", [tarefa("1a", { num_subtasks: 1 }), tarefa("1b", { num_subtasks: 0 })]],
    ["1a", [tarefa("1a1", { num_subtasks: 0 })]],
  ]);
  const { flat } = await montarArvore([tarefa("1", { num_subtasks: 2 })], async (gid) => filhas.get(gid) ?? []);

  assert.deepEqual(
    flat.map((e) => [e.task.gid, e.parentAsanaGid]),
    [
      ["1", null],
      ["1a", "1"],
      ["1a1", "1a"],
      ["1b", "1"],
    ]
  );
});

test("num_subtasks 0 não gera chamada à API", async () => {
  let chamadas = 0;
  const { contagem } = await montarArvore(
    [tarefa("1", { num_subtasks: 0 }), tarefa("2", { num_subtasks: 0 })],
    async () => {
      chamadas++;
      return [];
    }
  );
  assert.equal(chamadas, 0);
  assert.equal(contagem.folhasPuladas, 2);
  assert.equal(contagem.chamadasDeSubtarefa, 0);
});

test("tarefa sem num_subtasks ainda é consultada (não presume folha)", async () => {
  let chamadas = 0;
  await montarArvore([tarefa("1")], async () => {
    chamadas++;
    return [];
  });
  assert.equal(chamadas, 1);
});

test("a mesma tarefa alcançada por dois caminhos entra uma vez só", async () => {
  // "9" é card do quadro (órfã, pai fora do projeto) E subtarefa de "1a",
  // que por sua vez é subtarefa de "1". Sem controle de duplicidade, o
  // upsert receberia o mesmo gid duas vezes no mesmo lote e o Postgres
  // recusaria o lote inteiro.
  const filhas = new Map([
    ["1", [tarefa("1a", { num_subtasks: 1 })]],
    ["1a", [tarefa("9", { parent: { gid: "1a" }, num_subtasks: 0 })]],
  ]);
  const raizes = [
    tarefa("1", { num_subtasks: 1 }),
    tarefa("9", { parent: { gid: "1a" }, num_subtasks: 0 }),
  ];
  const { flat, contagem } = await montarArvore(raizes, async (gid) => filhas.get(gid) ?? []);

  const gids = flat.map((e) => e.task.gid);
  assert.deepEqual(gids, ["1", "1a", "9"]);
  assert.equal(new Set(gids).size, gids.length);
  assert.equal(contagem.duplicadas, 1);
  // entrou pelo caminho certo: com o pai de verdade, não como raiz solta
  assert.equal(flat.find((e) => e.task.gid === "9").parentAsanaGid, "1a");
});

test("erro ao buscar subtarefas é contado e não derruba o resto", async () => {
  const erros = [];
  const { flat, contagem } = await montarArvore(
    [tarefa("1", { num_subtasks: 1 }), tarefa("2", { num_subtasks: 0 })],
    async (gid) => {
      if (gid === "1") throw new Error("429 limite de taxa");
      return [];
    },
    { aoErrar: (t, err) => erros.push([t.gid, err.message]) }
  );

  assert.equal(contagem.errosDeSubtarefa, 1);
  assert.deepEqual(erros, [["1", "429 limite de taxa"]]);
  // a tarefa que falhou continua gravada; só as filhas dela é que faltam
  assert.deepEqual(flat.map((e) => e.task.gid), ["1", "2"]);
});

test("a profundidade máxima interrompe a descida sem travar", async () => {
  // cadeia infinita: cada tarefa tem uma filha nova
  let n = 0;
  const avisos = [];
  const { flat } = await montarArvore(
    [tarefa("raiz", { num_subtasks: 1 })],
    async () => [tarefa(`filha-${n++}`, { num_subtasks: 1 })],
    { maxProfundidade: 4, aoAvisar: (m) => avisos.push(m) }
  );
  assert.equal(flat.length, 4);
  assert.equal(avisos.length, 1);
});

test("um ciclo de pais não gera laço infinito", async () => {
  const filhas = new Map([
    ["a", [tarefa("b", { num_subtasks: 1 })]],
    ["b", [tarefa("a", { num_subtasks: 1 })]],
  ]);
  const { flat, contagem } = await montarArvore([tarefa("a", { num_subtasks: 1 })], async (gid) => filhas.get(gid) ?? []);
  assert.deepEqual(flat.map((e) => e.task.gid), ["a", "b"]);
  assert.equal(contagem.duplicadas, 1);
});
