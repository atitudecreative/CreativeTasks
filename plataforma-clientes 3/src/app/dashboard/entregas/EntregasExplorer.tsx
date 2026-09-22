"use client";

import { useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { Badge, Button, EmptyState, Icon, SearchInput, Select, cn } from "@/components/ui";
import { DeliverableCard } from "@/components/DeliverableCard";
import { DELIVERABLE_STATUS_LABEL } from "@/lib/deliverableOptions";
import type { Deliverable } from "@/lib/data/deliverables";

/* =========================================================================
   BIBLIOTECA DE ARQUIVOS
   -------------------------------------------------------------------------
   A tela mostrava uma grade de todos os arquivos, sem busca, sem filtro e
   sem agrupamento. Com algumas dezenas de entregas isso vira uma parede.

   Acrescentado: busca por título, filtro por status e por campanha, e um
   destaque para o que está esperando aprovação — que é a única coisa
   nessa tela que exige ação de alguém.
   ========================================================================= */

export function EntregasExplorer({
  deliverables,
  campaigns,
  canApprove,
}: {
  deliverables: Deliverable[];
  campaigns: { id: string; nome: string }[];
  canApprove: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [campanha, setCampanha] = useState("");

  const pendentes = useMemo(
    () => deliverables.filter((d) => d.status === "para_aprovacao"),
    [deliverables]
  );

  const hasFilter = Boolean(search.trim() || status || campanha);

  const visible = useMemo(() => {
    const term = normalizar(search.trim());
    return deliverables.filter((d) => {
      const matchesSearch =
        !term || normalizar(d.titulo).includes(term) || normalizar(d.tipo_arquivo ?? "").includes(term);
      const matchesStatus = !status || d.status === status;
      const matchesCampanha =
        !campanha || (campanha === "none" ? d.campaign_id == null : d.campaign_id === campanha);
      return matchesSearch && matchesStatus && matchesCampanha;
    });
  }, [deliverables, search, status, campanha]);

  function clearAll() {
    setSearch("");
    setStatus("");
    setCampanha("");
  }

  return (
    <div>
      {canApprove && pendentes.length > 0 && status !== "para_aprovacao" && (
        <button
          type="button"
          onClick={() => setStatus("para_aprovacao")}
          className={cn(
            "mb-4 flex w-full items-center gap-3 rounded-card border border-warning-line bg-warning-soft px-4 py-3 text-left",
            "transition-colors duration-120 hover:brightness-[0.98]"
          )}
        >
          <Icon.Clock className="h-4 w-4 shrink-0 text-warning" />
          <span className="min-w-0 flex-1 text-small text-ink">
            <strong className="font-medium">
              {pendentes.length} {pendentes.length === 1 ? "entrega aguarda" : "entregas aguardam"} sua aprovação
            </strong>
          </span>
          <span className="shrink-0 text-caption font-medium text-warning">Ver agora →</span>
        </button>
      )}

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por título ou tipo de arquivo..."
          aria-label="Buscar arquivo"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {Object.entries(DELIVERABLE_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
      </div>

      {hasFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">
            {visible.length} de {deliverables.length}
          </Badge>
          <Button variant="ghost" size="sm" onClick={clearAll} iconLeft={<Icon.X className="h-3.5 w-3.5" />}>
            Limpar filtros
          </Button>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Icon.Folder className="h-5 w-5" />}
          title={hasFilter ? "Nenhum arquivo com esses filtros" : "Nenhum arquivo registrado ainda"}
          description={
            hasFilter
              ? "Tente outro termo ou limpe os filtros para ver a biblioteca inteira."
              : "Quando a Comunicação registrar peças, artes e links finais, eles aparecem aqui."
          }
          action={
            hasFilter ? (
              <Button variant="secondary" onClick={clearAll} iconLeft={<Icon.Refresh className="h-4 w-4" />}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="signal-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((d) => (
            <DeliverableCard key={d.id} deliverable={d} canApprove={canApprove} />
          ))}
        </div>
      )}
    </div>
  );
}
