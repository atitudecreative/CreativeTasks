"use client";

import Link from "next/link";
import { Badge, CodeTag, Icon, Table, TBody, TD, TH, THead, TR, TableScroll, cn } from "@/components/ui";
import { statusTone } from "@/lib/statusColors";

export type DemandRow = {
  id: string;
  identificador: string | null;
  titulo: string;
  status: string;
  statusLabel: string;
  prioridade: string | null;
  prioridadeLabel: string | null;
  prazo: string | null;
  prazoFormatted: string;
  overdue: boolean;
  campanhas: { id: string; nome: string }[];
  childCount: number;
};

/* =========================================================================
   TABELA DE DEMANDAS
   -------------------------------------------------------------------------
   A quebra por breakpoint já existia aqui (era a única tabela do produto
   que tinha) e foi mantida — cinco colunas não cabem num celular. O que
   mudou:

   - Prioridade urgente/alta ganha marcador próprio: antes era texto cinza
     igual ao de "baixa", então a informação mais importante da coluna
     passava despercebida.
   - "Atrasada" deixa de ser só texto vermelho e vira badge com ícone —
     a informação não depende mais só da cor.
   - Identificador em mono: é um código, e o usuário compara e digita.
   ========================================================================= */

const PRIORIDADE_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  urgente: "danger",
  alta: "warning",
};

function Prioridade({ d }: { d: DemandRow }) {
  if (!d.prioridadeLabel) return <span className="text-ink-3">—</span>;
  const tone = PRIORIDADE_TONE[d.prioridade ?? ""];
  if (!tone) return <span className="text-ink-2">{d.prioridadeLabel}</span>;
  return (
    <Badge tone={tone} variant="outline" size="sm">
      {d.prioridadeLabel}
    </Badge>
  );
}

function Prazo({ d }: { d: DemandRow }) {
  if (!d.overdue) return <span className="text-ink-2 tabular-nums">{d.prazoFormatted}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-medium tabular-nums text-danger">{d.prazoFormatted}</span>
      <Badge tone="danger" size="sm" icon={<Icon.AlertTriangle className="h-3 w-3" />}>
        Atrasada
      </Badge>
    </span>
  );
}

function Campanhas({ campanhas }: { campanhas: DemandRow["campanhas"] }) {
  if (campanhas.length === 0) return <span className="text-ink-3">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {campanhas.slice(0, 2).map((c) => (
        <Badge key={c.id} tone="accent" size="sm">
          {c.nome}
        </Badge>
      ))}
      {campanhas.length > 2 && (
        <Badge tone="neutral" size="sm">
          +{campanhas.length - 2}
        </Badge>
      )}
    </span>
  );
}

export function DemandTable({ demands }: { demands: DemandRow[] }) {
  return (
    <>
      {/* Celular: lista de cards. Uma tabela de 5 colunas vira scroll
          horizontal cego nessa largura. */}
      <ul className="divide-y divide-line sm:hidden">
        {demands.map((d) => (
          <li key={d.id}>
            <Link
              href={`/dashboard/demandas/${d.id}`}
              className="block px-4 py-3 transition-colors duration-120 active:bg-surface-sunken"
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="min-w-0 text-small font-medium text-ink">{d.titulo}</span>
                <Icon.ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {d.identificador && <CodeTag>{d.identificador}</CodeTag>}
                {d.childCount > 0 && (
                  <Badge tone="neutral" size="sm">
                    +{d.childCount} {d.childCount === 1 ? "subtarefa" : "subtarefas"}
                  </Badge>
                )}
              </div>
              {d.campanhas.length > 0 && (
                <div className="mb-2">
                  <Campanhas campanhas={d.campanhas} />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-caption">
                <Badge tone={statusTone(d.status)} size="sm" dot>
                  {d.statusLabel}
                </Badge>
                <Prioridade d={d} />
                <span className={cn("flex items-center gap-1", d.overdue ? "text-danger" : "text-ink-3")}>
                  <Icon.Calendar className="h-3 w-3" />
                  {d.prazoFormatted}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet e desktop: tabela. */}
      <TableScroll className="hidden sm:block">
        <Table className="hidden sm:table">
          <THead>
            <TR>
              <TH>Demanda</TH>
              <TH className="hidden lg:table-cell">Campanha ou evento</TH>
              <TH>Status</TH>
              <TH className="hidden md:table-cell">Prioridade</TH>
              <TH>Prazo</TH>
            </TR>
          </THead>
          <TBody>
            {demands.map((d) => (
              <TR key={d.id} interactive>
                <TD strong className="max-w-[22rem]">
                  <Link href={`/dashboard/demandas/${d.id}`} className="group flex items-start gap-2">
                    <span className="min-w-0">
                      <span className="block truncate transition-colors group-hover:text-brand-600">{d.titulo}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {d.identificador && <CodeTag>{d.identificador}</CodeTag>}
                        {d.childCount > 0 && (
                          <Badge tone="neutral" size="sm">
                            +{d.childCount} {d.childCount === 1 ? "subtarefa" : "subtarefas"}
                          </Badge>
                        )}
                      </span>
                    </span>
                  </Link>
                </TD>
                <TD className="hidden lg:table-cell">
                  <Campanhas campanhas={d.campanhas} />
                </TD>
                <TD>
                  <Badge tone={statusTone(d.status)} size="sm" dot>
                    {d.statusLabel}
                  </Badge>
                </TD>
                <TD className="hidden md:table-cell">
                  <Prioridade d={d} />
                </TD>
                <TD>
                  <Prazo d={d} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableScroll>
    </>
  );
}
