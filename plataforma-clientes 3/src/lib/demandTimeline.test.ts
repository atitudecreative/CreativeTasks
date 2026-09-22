import test from "node:test";
import assert from "node:assert/strict";
import { marcosDaDemanda, transicoesComDuracao, duracaoLegivel } from "./demandTimeline.ts";

const base = {
  status: "em_producao",
  data_solicitacao: null as string | null,
  data_inicio: null as string | null,
  prazo_acordado: null as string | null,
  data_conclusao: null as string | null,
};

const marco = (d: Partial<typeof base>, chave: string, referencia = "2026-03-10") =>
  marcosDaDemanda({ ...base, ...d }, referencia).find((m) => m.chave === chave)!;

test("marco sem data no banco fica ausente, não inventa", () => {
  const m = marcosDaDemanda(base, "2026-03-10");
  assert.deepEqual(m.map((x) => x.estado), ["ausente", "ausente", "ausente", "ausente"]);
  assert.deepEqual(m.map((x) => x.nota), [null, null, null, null]);
});

test("prazo no futuro conta quantos dias faltam", () => {
  const m = marco({ prazo_acordado: "2026-03-15" }, "prazo");
  assert.equal(m.estado, "previsto");
  assert.equal(m.nota, "faltam 5 dias");
});

test("prazo vencido e demanda em aberto acusa o atraso", () => {
  const m = marco({ prazo_acordado: "2026-03-01" }, "prazo");
  assert.equal(m.estado, "vencido");
  assert.equal(m.nota, "9 dias em atraso");
});

test("prazo de hoje ainda não está vencido", () => {
  const m = marco({ prazo_acordado: "2026-03-10" }, "prazo");
  assert.equal(m.estado, "previsto");
  assert.equal(m.nota, "faltam 0 dias");
});

test("demanda concluída compara entrega com prazo, não com hoje", () => {
  const atrasada = marco(
    { status: "concluida", prazo_acordado: "2026-03-01", data_conclusao: "2026-03-04" },
    "prazo"
  );
  assert.equal(atrasada.estado, "registrado");
  assert.equal(atrasada.nota, "entregue 3 dias depois");

  const adiantada = marco(
    { status: "concluida", prazo_acordado: "2026-03-10", data_conclusao: "2026-03-08" },
    "prazo"
  );
  assert.equal(adiantada.nota, "entregue 2 dias antes");

  const noDia = marco(
    { status: "concluida", prazo_acordado: "2026-03-08", data_conclusao: "2026-03-08" },
    "prazo"
  );
  assert.equal(noDia.nota, "entregue no dia");
});

test("status concluído sem data de conclusão não vira 'vencido'", () => {
  // O sync do Asana marca aprovada sem preencher data_conclusao em casos
  // antigos; a tela não pode acusar atraso de algo que já foi entregue.
  const m = marco({ status: "aprovada", prazo_acordado: "2026-01-01" }, "prazo");
  assert.equal(m.estado, "registrado");
  assert.equal(m.nota, null);
});

test("tempo entre pedido e entrega sai da própria demanda", () => {
  const m = marco(
    { status: "concluida", data_solicitacao: "2026-02-01", data_conclusao: "2026-02-20" },
    "concluida"
  );
  assert.equal(m.nota, "19 dias do pedido à entrega");
});

test("singular e plural de um dia", () => {
  assert.equal(marco({ data_solicitacao: "2026-03-09" }, "solicitada").nota, "há 1 dia");
  assert.equal(marco({ data_solicitacao: "2026-03-08" }, "solicitada").nota, "há 2 dias");
});

test("transições saem em ordem e com o tempo no status anterior", () => {
  const t = transicoesComDuracao([
    { valor_anterior: "em_producao", valor_novo: "aguardando_aprovacao", created_at: "2026-03-05T12:00:00Z", autor: "Ana" },
    { valor_anterior: "recebida", valor_novo: "em_producao", created_at: "2026-03-01T12:00:00Z", autor: null },
  ]);

  assert.deepEqual(t.map((x) => x.para), ["em_producao", "aguardando_aprovacao"]);
  assert.equal(t[0].horasNoAnterior, null); // não se sabe quando o status anterior começou
  assert.equal(t[1].horasNoAnterior, 96);
});

test("linha sem valor novo é descartada em vez de virar transição para o nada", () => {
  const t = transicoesComDuracao([
    { valor_anterior: "recebida", valor_novo: null, created_at: "2026-03-01T12:00:00Z", autor: null },
  ]);
  assert.deepEqual(t, []);
});

test("duração legível", () => {
  assert.equal(duracaoLegivel(null), "—");
  assert.equal(duracaoLegivel(0.4), "menos de 1 h");
  assert.equal(duracaoLegivel(1), "1 hora");
  assert.equal(duracaoLegivel(30), "30 horas");
  assert.equal(duracaoLegivel(48), "2 dias");
  assert.equal(duracaoLegivel(200), "8 dias");
});
