// O cliente do Asana é o que separa "o cron leu tudo" de "o cron leu o que
// deu tempo antes de a API cortar". Estes testes cobrem exatamente os
// casos que faziam tarefa sumir: limite de taxa, resposta inesperada e
// paginação.
process.env.ASANA_MIN_INTERVAL_MS = "0";
process.env.ASANA_BACKOFF_BASE_MS = "10";
process.env.ASANA_MAX_RETRIES = "3";

import test from "node:test";
import assert from "node:assert/strict";

// import() e não `import ... from`: as declarações de import são avaliadas
// ANTES do corpo do módulo, então o cliente leria as variáveis de ambiente
// originais e o teste ficaria 30s parado esperando a espera exponencial de
// verdade. Com import dinâmico, o ajuste acima já está valendo.
const { asanaFetch, asanaPaginado, contadores, zerarContadores } = await import("./asana-client.mjs");

const original = globalThis.fetch;

function simular(respostas) {
  let i = 0;
  const chamadas = [];
  globalThis.fetch = async (url) => {
    chamadas.push(String(url));
    const r = respostas[Math.min(i++, respostas.length - 1)];
    if (typeof r === "function") return r();
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: new Map(Object.entries(r.headers ?? {})),
      json: async () => r.json,
      text: async () => JSON.stringify(r.json ?? r.body ?? ""),
    };
  };
  return chamadas;
}

test.afterEach(() => {
  globalThis.fetch = original;
  zerarContadores();
});

test("429 com Retry-After espera o tempo pedido e tenta de novo", async () => {
  simular([
    { status: 429, headers: { "retry-after": "0.02" }, body: "rate limited" },
    { status: 200, json: { data: [{ gid: "1" }] } },
  ]);
  const json = await asanaFetch("https://exemplo/tarefas", { token: "t" });
  assert.deepEqual(json.data, [{ gid: "1" }]);
  assert.equal(contadores.esperasPorLimite, 1);
  assert.equal(contadores.requisicoes, 2);
  assert.ok(contadores.msEsperando >= 20);
});

test("429 insistente estoura com mensagem de limite de taxa, não some calado", async () => {
  simular([{ status: 429, headers: {}, body: "rate limited" }]);
  await assert.rejects(() => asanaFetch("https://exemplo/tarefas", { token: "t", rotulo: "tarefas" }), /Limite de taxa/);
  assert.equal(contadores.requisicoes, 3); // ASANA_MAX_RETRIES
});

test("5xx é repetido; 404 não", async () => {
  simular([{ status: 500, body: "boom" }, { status: 200, json: { data: [] } }]);
  await asanaFetch("https://exemplo/a", { token: "t" });
  assert.equal(contadores.novasTentativas, 1);

  zerarContadores();
  simular([{ status: 404, body: "not found" }]);
  await assert.rejects(() => asanaFetch("https://exemplo/b", { token: "t" }), /404/);
  assert.equal(contadores.requisicoes, 1); // insistir em 404 só esconde a causa
});

test("200 sem lista vira erro explicando o que veio, não 'not iterable'", async () => {
  simular([{ status: 200, json: { gid: "1" } }]);
  await assert.rejects(
    () => asanaFetch("https://exemplo/c", { token: "t", rotulo: "projeto 7" }),
    /respondeu 200 sem lista em projeto 7/
  );
});

test("lista: false aceita endpoint que devolve um objeto só", async () => {
  simular([{ status: 200, json: { data: { gid: "1", name: "x" } } }]);
  const json = await asanaFetch("https://exemplo/tasks/1", { token: "t", lista: false });
  assert.equal(json.data.gid, "1");
});

test("a paginação percorre todas as páginas e conta cada uma", async () => {
  const chamadas = simular([
    { status: 200, json: { data: [{ gid: "1" }], next_page: { offset: "pag2" } } },
    { status: 200, json: { data: [{ gid: "2" }], next_page: { offset: "pag3" } } },
    { status: 200, json: { data: [{ gid: "3" }], next_page: null } },
  ]);

  const { itens, paginas } = await asanaPaginado("/projects/7/tasks", {
    token: "t",
    optFields: "name",
    limit: 1,
  });

  assert.deepEqual(itens.map((t) => t.gid), ["1", "2", "3"]);
  assert.equal(paginas, 3);
  assert.equal(contadores.paginas, 3);
  assert.ok(chamadas[0].includes("opt_fields=name"));
  assert.ok(chamadas[0].includes("limit=1"));
  assert.ok(!chamadas[0].includes("offset="));
  assert.ok(chamadas[1].includes("offset=pag2"));
  assert.ok(chamadas[2].includes("offset=pag3"));
});

test("falha de rede é repetida e, se persistir, estoura dizendo que foi rede", async () => {
  simular([() => Promise.reject(new Error("ECONNRESET"))]);
  await assert.rejects(
    () => asanaPaginado("/projects/7/tasks", { token: "t", rotulo: "projeto 7" }),
    /Rede falhou em projeto 7/
  );
  assert.equal(contadores.requisicoes, 3);
});
