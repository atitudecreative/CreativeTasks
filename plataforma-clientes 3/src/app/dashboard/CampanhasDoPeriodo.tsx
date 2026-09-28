"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Icon, Tabs, cn, type BadgeTone } from "@/components/ui";
import { formatMoney, formatByKey } from "@/lib/metricLanguage";
import { SAUDE_LABEL } from "@/lib/campaignOptions";
import { saudeTone } from "@/lib/statusColors";
import { formatarDiaMes } from "@/lib/dates";

/* =========================================================================
   CAMPANHAS DO PERÍODO
   -------------------------------------------------------------------------
   Responde "qual campanha contribuiu para isso?" logo abaixo dos totais:
   cada linha mostra quanto a campanha levou do investimento do período
   (a barra é a fatia dela no total), quantos resultados trouxe e a que
   custo. Clicar abre o relatório da campanha — o drill-down do número.

   Três ordens, porque são três perguntas diferentes: o que aconteceu por
   último, para onde foi o dinheiro, o que mais deu retorno.
   ========================================================================= */

export type CampanhaResultado = {
  id: string;
  nome: string;
  dataReferencia: string | null;
  saude: string;
  investimento: number | null;
  resultados: number | null;
  custoPorResultado: number | null;
  alcance: number | null;
};

type Ordem = "recentes" | "investimento" | "resultados";

const LIMITE = 6;

export function CampanhasDoPeriodo({ campanhas }: { campanhas: CampanhaResultado[] }) {
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [todas, setTodas] = useState(false);

  const totalInvestido = campanhas.reduce((t, c) => t + (c.investimento ?? 0), 0);
  const algumResultado = campanhas.some((c) => c.resultados != null);

  const ordenadas = useMemo(() => {
    const lista = [...campanhas];
    // Valor ausente vai para o fim em qualquer ordem: "sem dado" não é
    // "o menor valor".
    const porNumero = (k: "investimento" | "resultados") => (a: CampanhaResultado, b: CampanhaResultado) =>
      (b[k] ?? -Infinity) - (a[k] ?? -Infinity);
    if (ordem === "investimento") lista.sort(porNumero("investimento"));
    else if (ordem === "resultados") lista.sort(porNumero("resultados"));
    return lista;
  }, [campanhas, ordem]);

  const visiveis = todas ? ordenadas : ordenadas.slice(0, LIMITE);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-h4 text-ink">Campanhas e eventos do período</h3>
          <p className="mt-0.5 text-caption text-ink-3">
            A barra mostra a fatia de cada uma no investimento total. Clique para abrir o relatório.
          </p>
        </div>
        <Tabs<Ordem>
          value={ordem}
          onChange={setOrdem}
          tabs={[
            { value: "recentes", label: "Recentes" },
            { value: "investimento", label: "Investimento" },
            ...(algumResultado ? [{ value: "resultados" as const, label: "Resultados" }] : []),
          ]}
        />
      </div>

      {/* Cabeçalho de colunas — só onde há colunas (sm+). */}
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,1fr)_9rem_6rem_7.5rem] gap-4 border-b border-line px-5 py-2 font-mono text-label uppercase text-ink-3 md:grid"
      >
        <span>Campanha</span>
        <span className="text-right">Investimento</span>
        <span className="text-right">Resultados</span>
        <span className="text-right">Custo/result.</span>
      </div>

      <ul>
        {visiveis.map((c) => {
          const fatia = totalInvestido > 0 && c.investimento != null ? (c.investimento / totalInvestido) * 100 : null;
          const tone: BadgeTone = saudeTone(c.saude);
          return (
            <li key={c.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/dashboard/campanhas/${c.id}`}
                className="group/row grid grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors duration-120 hover:bg-surface-sunken sm:px-5 md:grid-cols-[minmax(0,1fr)_9rem_6rem_7.5rem]"
              >
                <span className="col-span-2 min-w-0 md:col-span-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-small font-medium text-ink transition-colors group-hover/row:text-brand-600">
                      {c.nome}
                    </span>
                    <Icon.ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover/row:opacity-100" />
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-ink-3">
                    {c.dataReferencia && <span className="tabular-nums">{formatarDiaMes(c.dataReferencia)}</span>}
                    <Badge tone={tone} size="sm" dot>
                      {SAUDE_LABEL[c.saude] ?? c.saude}
                    </Badge>
                  </span>
                </span>

                <span className="min-w-0 md:text-right">
                  <span className="block text-caption text-ink-3 md:hidden">Investimento</span>
                  <span className="block text-small font-medium tabular-nums text-ink">
                    {c.investimento != null ? formatMoney(c.investimento, true) : "—"}
                  </span>
                  {fatia != null && (
                    <span className="mt-1 flex items-center gap-1.5 md:justify-end">
                      <span className="h-1 w-full max-w-[5rem] overflow-hidden rounded-full bg-neutral-soft">
                        <span
                          className="block h-full origin-left rounded-full bg-brand-600 animate-bar-grow"
                          style={{ width: `${Math.max(2, fatia)}%` }}
                        />
                      </span>
                      <span className="font-mono text-[0.6875rem] tabular-nums text-ink-3">
                        {Math.round(fatia)}%
                      </span>
                    </span>
                  )}
                </span>

                <span className="min-w-0 md:text-right">
                  <span className="block text-caption text-ink-3 md:hidden">Resultados</span>
                  <span className={cn("text-small tabular-nums", c.resultados != null ? "font-medium text-ink" : "text-ink-3")}>
                    {c.resultados != null ? formatByKey("vendas", c.resultados) : "—"}
                  </span>
                </span>

                <span className={cn("col-span-2 min-w-0 md:col-span-1 md:block md:text-right", c.custoPorResultado == null && "hidden")}>
                  <span className="text-caption text-ink-3 md:hidden">Custo por resultado: </span>
                  <span className={cn("text-small tabular-nums", c.custoPorResultado != null ? "text-ink-2" : "text-ink-3")}>
                    {c.custoPorResultado != null ? formatByKey("cpa", c.custoPorResultado) : "—"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {ordenadas.length > LIMITE && (
        <div className="border-t border-line px-4 py-2.5 text-center sm:px-5">
          <button
            type="button"
            onClick={() => setTodas((v) => !v)}
            aria-expanded={todas}
            className="inline-flex min-h-8 items-center gap-1 text-caption font-medium text-brand-600 hover:underline"
          >
            {todas ? "Mostrar menos" : `Mostrar todas (${ordenadas.length})`}
            <Icon.ChevronDown className={cn("h-3.5 w-3.5 transition-transform", todas && "rotate-180")} />
          </button>
        </div>
      )}
    </div>
  );
}
