/* =========================================================================
   LINHA DO TEMPO DA DEMANDA
   -------------------------------------------------------------------------
   O detalhe da demanda mostrava as datas como quatro fatos soltos numa
   coluna lateral: "prazo acordado", "concluída em". Cada uma correta e,
   juntas, mudas — não respondem a pergunta que leva alguém a abrir a tela,
   que é "em que pé isso está, e há quanto tempo?".

   Aqui as mesmas datas viram uma sequência, com o tempo entre elas
   calculado. Nada é inventado: marco sem data no banco aparece como não
   registrado, e o tempo só é calculado quando as duas pontas existem.

   Puro de propósito (sem React, sem Supabase): é conta sobre data, que é
   exatamente o tipo de código que erra em silêncio e precisa de teste —
   ver demandTimeline.test.ts.
   ========================================================================= */

import { hoje, diasEntre, jaPassou } from "./dates.ts";

export type EstadoDoMarco =
  /** aconteceu, com data no banco */
  | "registrado"
  /** ainda vai acontecer */
  | "previsto"
  /** era para ter acontecido e não aconteceu */
  | "vencido"
  /** não existe data para isso */
  | "ausente";

export type Marco = {
  chave: "solicitada" | "iniciada" | "prazo" | "concluida";
  rotulo: string;
  data: string | null;
  estado: EstadoDoMarco;
  /** Texto curto com o que a data significa AGORA (nunca um palpite). */
  nota: string | null;
};

type DemandaComDatas = {
  status: string;
  data_solicitacao?: string | null;
  data_inicio?: string | null;
  prazo_acordado: string | null;
  data_conclusao: string | null;
};

const CONCLUIDOS = new Set(["aprovada", "agendada_ou_publicada", "concluida"]);

function plural(n: number, um: string, muitos: string) {
  return `${n} ${n === 1 ? um : muitos}`;
}

export function marcosDaDemanda(d: DemandaComDatas, referencia: string = hoje()): Marco[] {
  const concluida = Boolean(d.data_conclusao) || CONCLUIDOS.has(d.status);

  const solicitada: Marco = {
    chave: "solicitada",
    rotulo: "Solicitada",
    data: d.data_solicitacao ?? null,
    estado: d.data_solicitacao ? "registrado" : "ausente",
    nota: d.data_solicitacao ? `há ${plural(diasEntre(d.data_solicitacao, referencia), "dia", "dias")}` : null,
  };

  const iniciada: Marco = {
    chave: "iniciada",
    rotulo: "Produção iniciada",
    data: d.data_inicio ?? null,
    estado: d.data_inicio ? "registrado" : "ausente",
    nota:
      d.data_inicio && d.data_solicitacao
        ? `${plural(diasEntre(d.data_solicitacao, d.data_inicio), "dia", "dias")} após o pedido`
        : null,
  };

  const prazo: Marco = {
    chave: "prazo",
    rotulo: "Prazo acordado",
    data: d.prazo_acordado ?? null,
    estado: !d.prazo_acordado
      ? "ausente"
      : concluida
        ? "registrado"
        : jaPassou(d.prazo_acordado, referencia)
          ? "vencido"
          : "previsto",
    nota: !d.prazo_acordado || (concluida && !d.data_conclusao)
      // Status concluído sem data de conclusão: o Asana às vezes marca a
      // tarefa como aprovada sem completed_at. Comparar com HOJE aqui
      // faria a tela acusar atraso de algo que já foi entregue — melhor
      // não dizer nada do que dizer errado.
      ? null
      : concluida && d.data_conclusao
        ? diasEntre(d.prazo_acordado, d.data_conclusao) > 0
          ? `entregue ${plural(diasEntre(d.prazo_acordado, d.data_conclusao), "dia depois", "dias depois")}`
          : diasEntre(d.data_conclusao, d.prazo_acordado) > 0
            ? `entregue ${plural(diasEntre(d.data_conclusao, d.prazo_acordado), "dia antes", "dias antes")}`
            : "entregue no dia"
        : jaPassou(d.prazo_acordado, referencia)
          ? `${plural(diasEntre(d.prazo_acordado, referencia), "dia", "dias")} em atraso`
          : `faltam ${plural(diasEntre(referencia, d.prazo_acordado), "dia", "dias")}`,
  };

  const conclusao: Marco = {
    chave: "concluida",
    rotulo: "Concluída",
    data: d.data_conclusao ?? null,
    estado: d.data_conclusao ? "registrado" : "ausente",
    nota:
      d.data_conclusao && d.data_solicitacao
        ? `${plural(diasEntre(d.data_solicitacao, d.data_conclusao), "dia", "dias")} do pedido à entrega`
        : null,
  };

  return [solicitada, iniciada, prazo, conclusao];
}

/* -------------------------------------------------------------------------
   Histórico de status (audit_log, migration 0030)
   -------------------------------------------------------------------------
   O trigger grava uma linha por transição. O que interessa na tela não é
   a linha isolada, e sim quanto tempo a demanda passou em cada status —
   que é a diferença entre duas linhas consecutivas.
   ------------------------------------------------------------------------- */

export type LinhaDeHistorico = {
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
  autor: string | null;
};

export type Transicao = {
  de: string | null;
  para: string;
  em: string;
  autor: string | null;
  /** Horas no status anterior. Null na primeira transição (não se sabe
   *  quando o status anterior começou). */
  horasNoAnterior: number | null;
};

export function transicoesComDuracao(linhas: LinhaDeHistorico[]): Transicao[] {
  const ordenadas = [...linhas]
    .filter((l) => l.valor_novo)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return ordenadas.map((linha, i) => {
    const anterior = i > 0 ? ordenadas[i - 1] : null;
    const horas = anterior
      ? (new Date(linha.created_at).getTime() - new Date(anterior.created_at).getTime()) / 3_600_000
      : null;
    return {
      de: linha.valor_anterior,
      para: linha.valor_novo as string,
      em: linha.created_at,
      autor: linha.autor,
      horasNoAnterior: horas != null && Number.isFinite(horas) ? horas : null,
    };
  });
}

/** "3 h", "2 dias", "—". Arredonda pra baixo; duração é estimativa de
 *  leitura, não cobrança. */
export function duracaoLegivel(horas: number | null): string {
  if (horas == null) return "—";
  if (horas < 1) return "menos de 1 h";
  if (horas < 48) return plural(Math.floor(horas), "hora", "horas");
  return plural(Math.floor(horas / 24), "dia", "dias");
}
