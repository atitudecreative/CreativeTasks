"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Badge, Button, EmptyState, Icon, Panel, SearchInput, Select, Tooltip,
  Table, TBody, TD, TH, THead, TR, TableScroll, useToast, cn,
} from "@/components/ui";
import { STATUS_OPTIONS, STATUS_LABEL } from "@/lib/demandOptions";
import { STAGE_META, stageOf } from "@/lib/demandStages";
import { statusTone } from "@/lib/statusColors";
import { salvarRegraStatus, removerRegraGlobal } from "./actions";
import type { SecaoConfigurada } from "@/lib/data/asanaMapping";

/* =========================================================================
   TELA DE DE-PARA
   -------------------------------------------------------------------------
   A tela lista as colunas que o SYNC realmente encontrou nos quadros —
   não um campo em branco esperando alguém lembrar o nome exato. Cada
   linha mostra a coluna, quantas tarefas estão nela e para qual status do
   portal ela aponta hoje.

   A coluna "origem" é o que evita confusão: diz se o valor veio de uma
   regra global, de uma exceção daquele ministério, ou do padrão (nenhuma
   regra casou). Sem isso ninguém entende por que dois quadros com a mesma
   coluna se comportam diferente.
   ========================================================================= */

type Escopo = "global" | "ministerio";

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const ORIGEM_META: Record<SecaoConfigurada["origem"], { label: string; tone: "accent" | "neutral" | "warning"; hint: string }> = {
  ministerio: {
    label: "Deste ministério",
    tone: "accent",
    hint: "Uma exceção cadastrada só para este ministério. Vence a regra global.",
  },
  global: {
    label: "Global",
    tone: "neutral",
    hint: "Regra que vale para qualquer quadro com uma coluna de mesmo nome.",
  },
  padrao: {
    label: "Sem regra",
    tone: "warning",
    hint: "Nenhuma regra casou com esta coluna. O sync grava “Em produção”, que é o comportamento antigo.",
  },
};

function useRegra(s: SecaoConfigurada) {
  const [escopo, setEscopo] = useState<Escopo>(s.origem === "ministerio" ? "ministerio" : "global");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const valorAtual = escopo === "ministerio" ? s.statusDoMinisterio ?? "" : s.statusGlobal ?? "";

  function salvar(novoStatus: string) {
    const fd = new FormData();
    fd.set("secaoNormalizada", s.secaoNormalizada);
    fd.set("status", novoStatus);
    fd.set("escopo", escopo);
    fd.set("ministryId", s.ministryId);

    startTransition(async () => {
      const r = await salvarRegraStatus(fd);
      if (r.error) {
        toast.error({ title: "Não foi possível salvar", description: r.error });
      } else if (novoStatus) {
        toast.success({
          title: "Regra salva",
          description: `“${s.secao}” passa a virar “${STATUS_LABEL[novoStatus] ?? novoStatus}”${
            escopo === "ministerio" ? ` em ${s.ministryName}` : " em todos os quadros"
          }. Vale a partir da próxima sincronização.`,
        });
      } else {
        toast.success({ title: "Regra removida" });
      }
    });
  }

  return { escopo, setEscopo, valorAtual, isPending, salvar };
}

/** Os dois selects — reaproveitados pela linha de tabela e pelo card. */
function Controles({
  s,
  escopo,
  setEscopo,
  valorAtual,
  isPending,
  salvar,
  className,
}: ReturnType<typeof useRegra> & { s: SecaoConfigurada; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Select
        value={escopo}
        onChange={(e) => setEscopo(e.target.value as Escopo)}
        aria-label={`Escopo da regra para ${s.secao}`}
        className="h-control w-full text-caption sm:w-auto sm:flex-none"
      >
        <option value="global">Todos os quadros</option>
        <option value="ministerio">Só {s.ministryName}</option>
      </Select>

      <Select
        value={valorAtual}
        disabled={isPending}
        onChange={(e) => salvar(e.target.value)}
        aria-label={`Status para a coluna ${s.secao}`}
        className="h-control w-full text-caption sm:w-auto sm:flex-none"
      >
        <option value="">— sem regra —</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function StatusAtual({ s }: { s: SecaoConfigurada }) {
  const estagio = STAGE_META[stageOf(s.statusEfetivo)];
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge tone={statusTone(s.statusEfetivo)} size="sm" dot>
        {STATUS_LABEL[s.statusEfetivo] ?? s.statusEfetivo}
      </Badge>
      <Tooltip content={`Aparece no painel dentro do estágio “${estagio.label}”.`}>
        <span className="cursor-help font-mono text-[0.625rem] uppercase text-ink-3">{estagio.short}</span>
      </Tooltip>
    </span>
  );
}

/* Celular: card. A tabela rola na horizontal, e numa tela de 390px a
   coluna "Definir" — que é o ponto inteiro desta tela — ficava fora da
   área visível. Card resolve sem esconder o controle. */
function CardSecao({ s }: { s: SecaoConfigurada }) {
  const regra = useRegra(s);
  const origem = ORIGEM_META[s.origem];

  return (
    <li className="border-b border-line px-4 py-3 last:border-0">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-small font-medium text-ink">{s.secao}</span>
          <span className="block truncate font-mono text-[0.625rem] uppercase text-ink-3">
            {s.ministryName} · {s.totalTarefas} {s.totalTarefas === 1 ? "tarefa" : "tarefas"}
          </span>
        </span>
        <Badge tone={origem.tone} variant="outline" size="sm" className="shrink-0">
          {origem.label}
        </Badge>
      </div>
      <div className="mb-2.5">
        <StatusAtual s={s} />
      </div>
      <Controles s={s} {...regra} />
    </li>
  );
}

function LinhaSecao({ s }: { s: SecaoConfigurada }) {
  const regra = useRegra(s);
  const origem = ORIGEM_META[s.origem];

  return (
    <TR>
      <TD strong>
        <span className="block truncate">{s.secao}</span>
        <span className="mt-0.5 block font-mono text-[0.625rem] uppercase text-ink-3">{s.ministryName}</span>
      </TD>

      <TD numeric className="hidden md:table-cell">
        {s.totalTarefas}
      </TD>

      <TD>
        <StatusAtual s={s} />
      </TD>

      <TD className="hidden lg:table-cell">
        <Tooltip content={origem.hint}>
          <Badge tone={origem.tone} variant="outline" size="sm">
            {origem.label}
          </Badge>
        </Tooltip>
      </TD>

      <TD>
        <Controles s={s} {...regra} className="justify-end" />
      </TD>
    </TR>
  );
}

export function MapeamentoTable({
  secoes,
  orfas,
}: {
  secoes: SecaoConfigurada[];
  orfas: { id: string; secaoNormalizada: string; statusLabel: string }[];
}) {
  const [busca, setBusca] = useState("");
  const [soSemRegra, setSoSemRegra] = useState(false);
  const [ministerio, setMinisterio] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const ministerios = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of secoes) m.set(s.ministryId, s.ministryName);
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [secoes]);

  const semRegra = secoes.filter((s) => s.origem === "padrao").length;

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return secoes.filter((s) => {
      const casaBusca = !termo || normalizar(s.secao).includes(termo) || normalizar(s.ministryName).includes(termo);
      const casaMinisterio = !ministerio || s.ministryId === ministerio;
      const casaSemRegra = !soSemRegra || s.origem === "padrao";
      return casaBusca && casaMinisterio && casaSemRegra;
    });
  }, [secoes, busca, ministerio, soSemRegra]);

  if (secoes.length === 0) {
    return (
      <EmptyState
        icon={<Icon.Layers className="h-5 w-5" />}
        title="Nenhuma coluna encontrada ainda"
        description="As colunas dos quadros aparecem aqui depois da primeira sincronização com o Asana rodar já com esta versão. Rode npm run sync:asana e volte."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busca}
          onValueChange={setBusca}
          placeholder="Buscar coluna ou ministério..."
          aria-label="Buscar coluna"
          className="w-full sm:w-72"
        />
        <Select
          value={ministerio}
          onChange={(e) => setMinisterio(e.target.value)}
          aria-label="Filtrar por ministério"
          className="w-auto"
        >
          <option value="">Todos os ministérios</option>
          {ministerios.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </Select>

        {semRegra > 0 && (
          <button
            type="button"
            onClick={() => setSoSemRegra((v) => !v)}
            aria-pressed={soSemRegra}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium transition duration-120",
              soSemRegra
                ? "border-warning bg-warning text-white"
                : "border-warning-line text-warning hover:bg-warning-soft"
            )}
          >
            <Icon.AlertTriangle className="h-3 w-3" />
            {semRegra} sem regra
          </button>
        )}

        <span className="ml-auto text-caption tabular-nums text-ink-3">
          {visiveis.length} de {secoes.length}
        </span>
      </div>

      <Panel noPadding>
        {visiveis.length === 0 ? (
          <p className="px-5 py-10 text-center text-small text-ink-3">Nenhuma coluna com esses filtros.</p>
        ) : (
          <>
            <ul className="sm:hidden">
              {visiveis.map((s) => (
                <CardSecao key={`${s.ministryId}-${s.secaoNormalizada}`} s={s} />
              ))}
            </ul>

            <TableScroll className="hidden sm:block">
              <Table className="hidden sm:table">
                <THead>
                  <TR>
                    <TH>Coluna do quadro</TH>
                    <TH numeric className="hidden md:table-cell">Tarefas</TH>
                    <TH>Vira este status</TH>
                    <TH className="hidden lg:table-cell">Origem</TH>
                    <TH className="text-right">Definir</TH>
                  </TR>
                </THead>
                <TBody>
                  {visiveis.map((s) => (
                    <LinhaSecao key={`${s.ministryId}-${s.secaoNormalizada}`} s={s} />
                  ))}
                </TBody>
              </Table>
            </TableScroll>
          </>
        )}
      </Panel>

      {orfas.length > 0 && (
        <Panel
          title={`Regras sem coluna correspondente (${orfas.length})`}
          description="Regras globais que não casam com nenhuma coluna dos quadros de hoje — sugestões iniciais ou quadros que mudaram. Não fazem mal; pode limpar."
          noPadding
        >
          <ul className="divide-y divide-line">
            {orfas.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-2 sm:px-5">
                <span className="min-w-0 flex-1 truncate font-mono text-caption text-ink-2">{o.secaoNormalizada}</span>
                <Badge tone="neutral" size="sm">
                  {o.statusLabel}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", o.id);
                    startTransition(async () => {
                      const r = await removerRegraGlobal(fd);
                      if (r.error) toast.error({ title: "Não foi possível remover", description: r.error });
                      else toast.success({ title: "Regra removida" });
                    });
                  }}
                  iconLeft={<Icon.Trash className="h-3.5 w-3.5" />}
                >
                  <span className="sr-only">Remover regra {o.secaoNormalizada}</span>
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
