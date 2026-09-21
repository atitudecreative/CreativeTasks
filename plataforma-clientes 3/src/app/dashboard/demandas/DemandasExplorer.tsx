"use client";

import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, Icon, SearchInput, Select, cn } from "@/components/ui";
import { MonthAccordion } from "./MonthAccordion";
import { DemandTable, type DemandRow } from "./DemandTable";
import { STATUS_OPTIONS, PRIORIDADE_OPTIONS } from "@/lib/demandOptions";
import { STAGE_META, STAGE_ORDER, stageOf, type StageKey } from "@/lib/demandStages";

export type FilterCampaign = { id: string; nome: string };

/* =========================================================================
   EXPLORADOR DE DEMANDAS
   -------------------------------------------------------------------------
   Mudanças de UX sobre a versão anterior:

   1. FILTRO RÁPIDO POR ESTÁGIO em cima de tudo. O filtro de status tinha
      14 opções num <select> — ninguém abre um select de 14 pra descobrir
      o que está travado. Os cinco chips respondem a pergunta real ("o que
      está comigo?") num clique, e trazem a contagem junto. O select de
      status continua ali, pro caso específico.
   2. FILTROS ATIVOS VISÍVEIS como chips removíveis. Antes um filtro
      ligado só aparecia como "12 de 340" no canto — dava pra achar que a
      lista estava vazia quando era só um filtro esquecido.
   3. A busca varre título, identificador E campanha (já varria), agora
      com o campo certo (type=search, botão de limpar, ícone).
   ========================================================================= */

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function DemandasExplorer({
  demands,
  campaigns,
}: {
  demands: DemandRow[];
  campaigns: FilterCampaign[];
}) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<StageKey | "">("");
  const [status, setStatus] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [campanha, setCampanha] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const stageCounts = useMemo(() => {
    const map = new Map<StageKey, number>();
    for (const d of demands) {
      const k = stageOf(d.status);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [demands]);

  const overdueCount = useMemo(() => demands.filter((d) => d.overdue).length, [demands]);

  const activeFilters = [
    search.trim() && { key: "search", label: `"${search.trim()}"`, clear: () => setSearch("") },
    stage && { key: "stage", label: STAGE_META[stage].label, clear: () => setStage("") },
    status && {
      key: "status",
      label: STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status,
      clear: () => setStatus(""),
    },
    prioridade && {
      key: "prioridade",
      label: PRIORIDADE_OPTIONS.find((p) => p.value === prioridade)?.label ?? prioridade,
      clear: () => setPrioridade(""),
    },
    campanha && {
      key: "campanha",
      label: campanha === "none" ? "Sem campanha" : campaigns.find((c) => c.id === campanha)?.nome ?? campanha,
      clear: () => setCampanha(""),
    },
    onlyOverdue && { key: "overdue", label: "Só atrasadas", clear: () => setOnlyOverdue(false) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const hasActiveFilter = activeFilters.length > 0;

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return demands.filter((d) => {
      const matchesSearch =
        !term ||
        normalize(d.titulo).includes(term) ||
        (d.identificador && normalize(d.identificador).includes(term)) ||
        d.campanhas.some((c) => normalize(c.nome).includes(term));
      const matchesStage = !stage || stageOf(d.status) === stage;
      const matchesStatus = !status || d.status === status;
      const matchesPrioridade = !prioridade || d.prioridade === prioridade;
      const matchesCampanha =
        !campanha ||
        (campanha === "none" ? d.campanhas.length === 0 : d.campanhas.some((c) => c.id === campanha));
      const matchesOverdue = !onlyOverdue || d.overdue;
      return matchesSearch && matchesStage && matchesStatus && matchesPrioridade && matchesCampanha && matchesOverdue;
    });
  }, [demands, search, stage, status, prioridade, campanha, onlyOverdue]);

  // Agrupamento por mês só vale na visão sem filtro — com filtro, o
  // usuário quer ver TUDO que bateu numa lista só, não caçar mês a mês.
  const grouped = useMemo(() => {
    const map = new Map<string, DemandRow[]>();
    for (const d of demands) {
      const key = d.prazo ? d.prazo.slice(0, 7) : "sem-prazo";
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    return map;
  }, [demands]);

  function clearAll() {
    setSearch("");
    setStage("");
    setStatus("");
    setPrioridade("");
    setCampanha("");
    setOnlyOverdue(false);
  }

  function formatMonthLabel(key: string): string {
    if (key === "sem-prazo") return "Sem prazo definido";
    const [year, month] = key.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  return (
    <div>
      {/* ---------- Chips de estágio ---------- */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setStage("")}
          aria-pressed={stage === ""}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium transition duration-120",
            stage === ""
              ? "border-ink bg-ink text-ink-inverse"
              : "border-line-strong text-ink-2 hover:border-ink-3/50 hover:bg-surface-sunken"
          )}
        >
          Todas
          <span className="font-mono text-[0.625rem] tabular-nums opacity-70">{demands.length}</span>
        </button>

        {STAGE_ORDER.filter((k) => (stageCounts.get(k) ?? 0) > 0).map((k) => {
          const meta = STAGE_META[k];
          const selected = stage === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setStage(selected ? "" : k)}
              aria-pressed={selected}
              title={meta.description}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium transition duration-120",
                selected
                  ? "border-ink bg-ink text-ink-inverse"
                  : "border-line-strong text-ink-2 hover:border-ink-3/50 hover:bg-surface-sunken"
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `rgb(var(${meta.cssVar}))` }}
                aria-hidden="true"
              />
              {meta.label}
              <span className="font-mono text-[0.625rem] tabular-nums opacity-70">{stageCounts.get(k)}</span>
            </button>
          );
        })}

        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setOnlyOverdue((v) => !v)}
            aria-pressed={onlyOverdue}
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium transition duration-120",
              onlyOverdue
                ? "border-danger bg-danger text-white"
                : "border-danger-line text-danger hover:bg-danger-soft"
            )}
          >
            <Icon.AlertTriangle className="h-3 w-3" />
            {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* ---------- Busca e filtros secundários ---------- */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Nome, identificador (DEM-2026-…) ou campanha"
          aria-label="Buscar demandas"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select value={campanha} onChange={(e) => setCampanha(e.target.value)} aria-label="Filtrar por campanha">
          <option value="">Todas as campanhas</option>
          <option value="none">Sem campanha</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <Select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} aria-label="Filtrar por prioridade">
          <option value="">Todas as prioridades</option>
          {PRIORIDADE_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {/* ---------- Filtros ativos ---------- */}
      {hasActiveFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface-sunken px-3 py-2">
          <span className="font-mono text-label uppercase text-ink-3">Filtros</span>
          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.clear}
              className="inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-caption text-ink-2 shadow-xs transition hover:text-ink"
            >
              <span className="truncate">{f.label}</span>
              <Icon.X className="h-3 w-3 shrink-0 opacity-60" />
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2 text-caption text-ink-3">
            <span className="tabular-nums">
              <strong className="font-medium text-ink">{filtered.length}</strong> de {demands.length}
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Limpar
            </Button>
          </span>
        </div>
      )}

      {/* ---------- Resultado ---------- */}
      {demands.length === 0 ? (
        <EmptyState
          icon={<Icon.ListChecks className="h-5 w-5" />}
          title="Nenhuma demanda publicada ainda"
          description="Assim que a Comunicação publicar demandas deste ministério a partir de 2026, elas aparecem aqui."
        />
      ) : hasActiveFilter ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Icon.Search className="h-5 w-5" />}
            title="Nenhuma demanda com esses filtros"
            description="Tente outro termo de busca ou remova um dos filtros ativos acima."
            action={
              <Button variant="secondary" onClick={clearAll} iconLeft={<Icon.Refresh className="h-4 w-4" />}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-xs">
            <DemandTable demands={filtered} />
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {Array.from(grouped.entries()).map(([key, rows], i) => (
            // O mês mais próximo já abre expandido — é o que a pessoa
            // veio ver na maior parte das vezes.
            <MonthAccordion key={key} monthLabel={formatMonthLabel(key)} demands={rows} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {!hasActiveFilter && demands.length > 0 && (
        <p className="mt-3 text-caption text-ink-3">
          {demands.length} {demands.length === 1 ? "demanda" : "demandas"} de 2026 em diante, agrupadas por mês de prazo.
        </p>
      )}
    </div>
  );
}
