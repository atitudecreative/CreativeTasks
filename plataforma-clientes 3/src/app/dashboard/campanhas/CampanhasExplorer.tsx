"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CodeTag, EmptyState, Icon, Progress, SearchInput, Select, cn } from "@/components/ui";
import { saudeTone } from "@/lib/statusColors";
import { formatMoney } from "@/lib/metricLanguage";
import { SAUDE_OPTIONS, TIPO_OPTIONS } from "@/lib/campaignOptions";

export type CampaignCardData = {
  id: string;
  nome: string;
  identificador: string | null;
  tipo: string;
  tipoLabel: string;
  fase: string;
  faseLabel: string;
  saude: string;
  saudeLabel: string;
  capaUrl: string | null;
  dataInicio: string | null;
  dataTermino: string | null;
  dataEvento: string | null;
  orcamentoAprovado: number | null;
  investimentoRealizado: number | null;
};

/* =========================================================================
   LISTA DE CAMPANHAS E EVENTOS
   -------------------------------------------------------------------------
   A versão anterior era um `grid-cols-3` fixo (três colunas em qualquer
   tela, inclusive no celular) de cards mostrando nome, saúde, fase e
   orçamento aprovado — sem busca, sem filtro, sem ordenação, e sem
   nenhuma noção de quando o evento aconteceu.

   O que mudou:
   - Grade responsiva de verdade: 1 / 2 / 3 colunas.
   - Busca e filtro por saúde e tipo, mais ordenação por data ou verba.
   - O card passa a mostrar PERÍODO e USO DO ORÇAMENTO, que é o que
     diferencia um evento do outro numa lista — "R$ 8.000 aprovados" não
     diz nada sozinho; "R$ 6.240 de R$ 8.000" diz.
   - Campanha sem capa ganha uma marca tipográfica gerada do nome, em vez
     do retângulo vazio que existia antes.
   ========================================================================= */

type SortKey = "recentes" | "investimento" | "nome";

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function shortDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

function periodLabel(c: CampaignCardData): string | null {
  if (c.dataEvento) return `Evento em ${shortDate(c.dataEvento)}`;
  const i = shortDate(c.dataInicio);
  const f = shortDate(c.dataTermino);
  if (i && f) return `${i} — ${f}`;
  return i ?? f;
}

function sortDateOf(c: CampaignCardData): string {
  return c.dataEvento ?? c.dataTermino ?? c.dataInicio ?? "";
}

function CampaignCard({ c }: { c: CampaignCardData }) {
  const uso =
    c.orcamentoAprovado && c.orcamentoAprovado > 0 && c.investimentoRealizado != null
      ? (c.investimentoRealizado / c.orcamentoAprovado) * 100
      : null;
  const periodo = periodLabel(c);

  return (
    <Link href={`/dashboard/campanhas/${c.id}`} className="group block">
      <Card interactive className="flex h-full flex-col overflow-hidden">
        {c.capaUrl ? (
          <div
            className="aspect-[16/9] w-full shrink-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${c.capaUrl})` }}
            role="img"
            aria-label={`Capa de ${c.nome}`}
          />
        ) : (
          // Sem arte cadastrada: marca tipográfica com a inicial sobre um
          // campo neutro. Preenche o espaço com identidade em vez de um
          // bloco cinza — e nunca compete com a capa de verdade.
          <div className="flex aspect-[16/9] w-full shrink-0 items-center justify-center bg-surface-sunken">
            <span className="select-none text-[3rem] font-bold leading-none tracking-tight text-line-strong">
              {c.nome.trim().charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={saudeTone(c.saude)} size="sm" dot>
              {c.saudeLabel}
            </Badge>
            <Badge tone="neutral" size="sm">
              {c.tipoLabel}
            </Badge>
          </div>

          <h3 className="text-h3 text-ink transition-colors duration-120 group-hover:text-brand-600">{c.nome}</h3>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-ink-3">
            {periodo && (
              <span className="flex items-center gap-1">
                <Icon.Calendar className="h-3 w-3" />
                {periodo}
              </span>
            )}
            <span>{c.faseLabel}</span>
          </p>

          <div className="mt-auto pt-4">
            {uso != null ? (
              <>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-caption">
                  <span className="text-ink-2">
                    <span className="font-medium tabular-nums text-ink">{formatMoney(c.investimentoRealizado, true)}</span>
                    <span className="text-ink-3"> de {formatMoney(c.orcamentoAprovado, true)}</span>
                  </span>
                  <span className={cn("font-medium tabular-nums", uso > 100 ? "text-danger" : "text-ink-3")}>
                    {uso.toFixed(0)}%
                  </span>
                </div>
                <Progress value={Math.min(uso, 100)} tone={uso > 100 ? "danger" : "accent"} size="sm" showValue={false} />
              </>
            ) : (
              <p className="text-caption text-ink-3">
                {c.orcamentoAprovado != null
                  ? `Orçamento aprovado: ${formatMoney(c.orcamentoAprovado, true)}`
                  : "Sem orçamento lançado"}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function CampanhasExplorer({ campaigns }: { campaigns: CampaignCardData[] }) {
  const [search, setSearch] = useState("");
  const [saude, setSaude] = useState("");
  const [tipo, setTipo] = useState("");
  const [sort, setSort] = useState<SortKey>("recentes");

  const hasFilter = Boolean(search.trim() || saude || tipo);

  const visible = useMemo(() => {
    const term = normalize(search.trim());
    const filtered = campaigns.filter((c) => {
      const matchesSearch = !term || normalize(c.nome).includes(term) || normalize(c.identificador ?? "").includes(term);
      return matchesSearch && (!saude || c.saude === saude) && (!tipo || c.tipo === tipo);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (sort === "investimento") return (b.investimentoRealizado ?? 0) - (a.investimentoRealizado ?? 0);
      // Mais recentes primeiro; sem data vai pro fim da lista.
      const da = sortDateOf(a);
      const db = sortDateOf(b);
      if (!da && !db) return a.nome.localeCompare(b.nome, "pt-BR");
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    });
  }, [campaigns, search, saude, tipo, sort]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar campanha ou evento..."
          aria-label="Buscar campanha"
        />
        <Select value={saude} onChange={(e) => setSaude(e.target.value)} aria-label="Filtrar por saúde">
          <option value="">Todas as situações</option>
          {SAUDE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          {TIPO_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar">
          <option value="recentes">Mais recentes</option>
          <option value="investimento">Maior investimento</option>
          <option value="nome">Ordem alfabética</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Icon.Search className="h-5 w-5" />}
          title="Nenhuma campanha com esses filtros"
          description="Tente outro termo ou limpe os filtros para ver todas."
          action={
            <Button
              variant="secondary"
              iconLeft={<Icon.Refresh className="h-4 w-4" />}
              onClick={() => {
                setSearch("");
                setSaude("");
                setTipo("");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <>
          {hasFilter && (
            <p className="mb-3 text-caption text-ink-3">
              <span className="font-medium tabular-nums text-ink">{visible.length}</span> de {campaigns.length}{" "}
              {campaigns.length === 1 ? "campanha" : "campanhas"}
            </p>
          )}
          <div className="signal-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
