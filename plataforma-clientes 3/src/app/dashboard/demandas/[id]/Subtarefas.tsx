"use client";

import { useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { formatarDiaMes } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/demandOptions";
import { STAGE_META, STAGE_ORDER, stageOf, type StageKey } from "@/lib/demandStages";
import { statusTone } from "@/lib/statusColors";
import {
  Badge, Board, BoardEmpty, BoardRow, Button, Icon, Progress, SearchInput, cn,
} from "@/components/ui";

/* =========================================================================
   SUBTAREFAS
   -------------------------------------------------------------------------
   Aqui havia uma lista simples: título + badge de status, uma linha por
   filha, todas de uma vez.

   Isso quebra na escala real desta base. O sync do Asana já trouxe uma
   tarefa guarda-chuva com mais de 1.500 filhas (é o caso citado no próprio
   comentário do sync-asana.mjs). Mil e quinhentas linhas renderizadas de
   uma vez não é só lentidão: é uma tela por onde não se navega, sem busca,
   sem recorte, com o conteúdo que importa — o que está atrasado — perdido
   no meio.

   O que a lista passa a oferecer:
     - barra de progresso e contagem por estágio no topo (o resumo que
       responde antes de rolar);
     - filtro por estágio e busca, que só aparecem quando há volume
       suficiente para justificá-los;
     - as atrasadas primeiro, sempre;
     - renderização em blocos, com "mostrar mais" — a página abre rápido
       independentemente do tamanho da árvore.
   ========================================================================= */

export type SubtarefaRow = {
  id: string;
  titulo: string;
  identificador: string | null;
  status: string;
  prazo_acordado: string | null;
  atrasada: boolean;
};

const LOTE = 50;
/** A partir daqui a lista ganha busca e filtro. Abaixo disso, controle é
 *  estorvo: dá para ler tudo de uma vez. */
const LIMIAR_DE_CONTROLES = 12;

export function Subtarefas({ itens }: { itens: SubtarefaRow[] }) {
  const [busca, setBusca] = useState("");
  const [estagio, setEstagio] = useState<StageKey | "">("");
  const [visiveis, setVisiveis] = useState(LOTE);

  const porEstagio = useMemo(() => {
    const m = new Map<StageKey, number>();
    for (const i of itens) m.set(stageOf(i.status), (m.get(stageOf(i.status)) ?? 0) + 1);
    return m;
  }, [itens]);

  const concluidas = porEstagio.get("concluida") ?? 0;
  const atrasadas = itens.filter((i) => i.atrasada).length;
  const progresso = itens.length > 0 ? (concluidas / itens.length) * 100 : 0;

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    const lista = itens.filter((i) => {
      if (estagio && stageOf(i.status) !== estagio) return false;
      if (!termo) return true;
      return normalizar(`${i.titulo} ${i.identificador ?? ""}`).includes(termo);
    });

    // Atrasadas primeiro; depois por prazo; sem prazo por último. Ordenar
    // aqui e não no banco porque o filtro é do cliente — a ordem tem que
    // valer para o recorte que está na tela.
    return lista.sort((a, b) => {
      if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
      if (!a.prazo_acordado) return b.prazo_acordado ? 1 : 0;
      if (!b.prazo_acordado) return -1;
      return a.prazo_acordado.localeCompare(b.prazo_acordado);
    });
  }, [itens, busca, estagio]);

  const mostrarControles = itens.length >= LIMIAR_DE_CONTROLES;
  const naTela = filtradas.slice(0, visiveis);

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-h3 text-ink">Subtarefas</h2>
        <p className="text-caption tabular-nums text-ink-3">
          {concluidas} de {itens.length} concluídas
          {atrasadas > 0 && <span className="text-danger"> · {atrasadas} atrasada{atrasadas === 1 ? "" : "s"}</span>}
        </p>
      </div>

      <Progress
        value={progresso}
        tone={progresso === 100 ? "success" : "accent"}
        showValue={false}
        className="mb-3"
      />

      {mostrarControles && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SearchInput
            value={busca}
            onValueChange={(v) => {
              setBusca(v);
              setVisiveis(LOTE);
            }}
            placeholder="Buscar nas subtarefas"
            className="min-w-[12rem] flex-1"
          />
          <div className="flex flex-wrap gap-1.5">
            {STAGE_ORDER.filter((k) => (porEstagio.get(k) ?? 0) > 0).map((k) => {
              const ativo = estagio === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setEstagio(ativo ? "" : k);
                    setVisiveis(LOTE);
                  }}
                  aria-pressed={ativo}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1.5 rounded-control border px-2.5 text-caption transition-colors duration-120",
                    ativo
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-line text-ink-2 hover:bg-surface-sunken"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ background: `rgb(var(${STAGE_META[k].cssVar}))` }}
                  />
                  {STAGE_META[k].short}
                  <span className="tabular-nums text-ink-3">{porEstagio.get(k)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Board>
        {naTela.length === 0 ? (
          <BoardEmpty>Nenhuma subtarefa corresponde ao recorte atual.</BoardEmpty>
        ) : (
          naTela.map((s) => (
            <BoardRow
              key={s.id}
              href={`/dashboard/demandas/${s.id}`}
              tone={s.atrasada ? "danger" : undefined}
              leading={
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ background: `rgb(var(${STAGE_META[stageOf(s.status)].cssVar}))` }}
                />
              }
              trailing={
                <>
                  {s.prazo_acordado && (
                    <span
                      className={cn(
                        "hidden text-caption tabular-nums sm:inline",
                        s.atrasada ? "text-danger" : "text-ink-3"
                      )}
                    >
                      {formatarDiaMes(s.prazo_acordado)}
                    </span>
                  )}
                  <Badge tone={statusTone(s.status)} size="sm" dot>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </Badge>
                </>
              }
            >
              <span className="block truncate text-small text-ink">{s.titulo}</span>
            </BoardRow>
          ))
        )}
      </Board>

      {filtradas.length > naTela.length && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setVisiveis((v) => v + LOTE)}>
            Mostrar mais {Math.min(LOTE, filtradas.length - naTela.length)}
            <Icon.ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <span className="text-caption tabular-nums text-ink-3">
            {naTela.length} de {filtradas.length}
          </span>
        </div>
      )}
    </section>
  );
}
