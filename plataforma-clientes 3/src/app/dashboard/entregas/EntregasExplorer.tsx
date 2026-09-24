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
   A tela mostrava UMA grade com tudo: nove, trinta, cem cards do mesmo
   tamanho, na ordem em que o banco devolveu. Havia busca e filtro, mas
   nenhuma ordem — e duas perguntas ficavam sem resposta:

     "o que está esperando por mim?"  — havia um aviso no topo que ligava
        um filtro, mas a grade em si não separava nada;
     "de que evento é esta peça?"     — a campanha não aparecia em lugar
        nenhum do card. Uma biblioteca em que o material não diz a que
        pertence é um monte de arquivos, não uma biblioteca.

   Agora a grade é dividida em blocos, nesta ordem:

     1. Aguardando sua aprovação — só para quem aprova, e só quando há.
        É a única coisa nesta tela que exige ação de alguém.
     2. Um bloco por campanha, na ordem em que as campanhas já vêm.
     3. Sem campanha, por último.

   O cabeçalho de cada bloco carrega o nome da campanha e a contagem, então
   a informação que faltava no card passa a existir uma vez por bloco, em
   vez de repetida em cada cartão.
   ========================================================================= */

type Grupo = {
  chave: string;
  titulo: string;
  eyebrow?: string;
  itens: Deliverable[];
  destaque?: boolean;
};

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

  const grupos = useMemo<Grupo[]>(() => {
    const resultado: Grupo[] = [];
    const jaAgrupados = new Set<string>();

    // O bloco de aprovação só existe para quem aprova. Quando o usuário
    // filtra explicitamente por "para aprovação", ele deixa de ser um
    // destaque (seria o único bloco da tela) e a lista volta a ser por
    // campanha.
    if (canApprove && status !== "para_aprovacao") {
      const aguardando = visible.filter((d) => d.status === "para_aprovacao");
      if (aguardando.length > 0) {
        resultado.push({
          chave: "aguardando",
          eyebrow: "Precisa de você",
          titulo: "Aguardando sua aprovação",
          itens: aguardando,
          destaque: true,
        });
        for (const d of aguardando) jaAgrupados.add(d.id);
      }
    }

    const porCampanha = new Map<string, Deliverable[]>();
    const semCampanha: Deliverable[] = [];
    for (const d of visible) {
      if (jaAgrupados.has(d.id)) continue;
      if (!d.campaign_id) {
        semCampanha.push(d);
        continue;
      }
      const lista = porCampanha.get(d.campaign_id) ?? [];
      lista.push(d);
      porCampanha.set(d.campaign_id, lista);
    }

    for (const c of campaigns) {
      const itens = porCampanha.get(c.id);
      if (itens && itens.length > 0) {
        resultado.push({ chave: c.id, eyebrow: "Campanha", titulo: c.nome, itens });
      }
    }

    // Campanha que o usuário não enxerga na lista de filtro (ex: ainda
    // pendente de publicação) mas cujo material está aqui: entra mesmo
    // assim, sem nome inventado.
    for (const [id, itens] of porCampanha) {
      if (!campaigns.some((c) => c.id === id)) {
        resultado.push({ chave: id, eyebrow: "Campanha", titulo: "Campanha não publicada", itens });
      }
    }

    if (semCampanha.length > 0) {
      resultado.push({ chave: "sem-campanha", titulo: "Sem campanha vinculada", itens: semCampanha });
    }

    return resultado;
  }, [visible, campaigns, canApprove, status]);

  function clearAll() {
    setSearch("");
    setStatus("");
    setCampanha("");
  }

  return (
    <div>
      {canApprove && pendentes.length > 0 && status !== "para_aprovacao" && (
        <div
          className={cn(
            "mb-4 flex items-center gap-3 rounded-card border border-warning-line bg-warning-soft px-4 py-3"
          )}
        >
          <Icon.Clock className="h-4 w-4 shrink-0 text-warning" />
          <span className="min-w-0 flex-1 text-small text-ink">
            <strong className="font-medium">
              {pendentes.length} {pendentes.length === 1 ? "entrega aguarda" : "entregas aguardam"} sua aprovação
            </strong>
            {" — estão no primeiro bloco abaixo."}
          </span>
          <button
            type="button"
            onClick={() => setStatus("para_aprovacao")}
            // min-h-8 e padding: sem isso o alvo de toque fica com 16px de
            // altura no celular — a varredura reprova, e com razão.
            className="-mr-2 inline-flex min-h-8 shrink-0 items-center rounded-control px-2 text-caption font-medium text-warning underline-offset-4 hover:underline"
          >
            Ver só essas
          </button>
        </div>
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
        <div className="space-y-6">
          {grupos.map((g) => (
            <section key={g.chave} className="min-w-0">
              <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-line pb-1.5">
                {g.eyebrow && (
                  <span
                    className={cn(
                      "font-mono text-label uppercase",
                      g.destaque ? "text-warning" : "text-ink-3"
                    )}
                  >
                    {g.eyebrow}
                  </span>
                )}
                <h2 className="min-w-0 text-h4 text-ink">{g.titulo}</h2>
                <span className="font-mono text-label uppercase tabular-nums text-ink-3">{g.itens.length}</span>
              </div>

              {/* items-start: card sem prévia é mais baixo, e esticá-lo até
                  a altura do vizinho só devolveria o vazio que a faixa
                  compacta acabou de eliminar. */}
              <div className="signal-stagger grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {g.itens.map((d) => (
                  <DeliverableCard key={d.id} deliverable={d} canApprove={canApprove} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
