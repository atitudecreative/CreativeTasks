"use client";

import { useMemo, useState } from "react";
import { normalizar } from "@/lib/texto";
import { formatarDiaMes } from "@/lib/dates";
import {
  Badge, Board, BoardEmpty, BoardGroup, BoardRow, CodeTag, EmptyState, Icon,
  PageBody, Panel, RailBlock, RailStat, SearchInput, Select, Toolbar, cn,
} from "@/components/ui";
import { saudeTone } from "@/lib/statusColors";
import { formatMoney, formatCompact, formatPercent } from "@/lib/metricLanguage";
import { SAUDE_OPTIONS, TIPO_OPTIONS } from "@/lib/campaignOptions";
import { Timeline } from "@/components/charts/Timeline";

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
  dataInicio: string | null;
  dataTermino: string | null;
  dataEvento: string | null;
  orcamentoAprovado: number | null;
  investimento: number | null;
  demandasTotal: number | null;
  demandasConcluidas: number | null;
  entregasTotal: number | null;
  progressoMarcos: number | null;
  alcance: number | null;
};

/* =========================================================================
   CAMPANHAS E EVENTOS
   -------------------------------------------------------------------------
   O que esta tela era: uma grade de cards, cada um com 200px de retângulo
   cinza e uma letra gigante no lugar da capa. Dois cards numa tela de
   1440px deixavam dois terços da página vazios, e a informação real — nome,
   saúde, período, orçamento — ocupava a faixa de baixo.

   Três decisões:

   1. A CAPA SAIU DA LISTA. Ela não distingue uma campanha da outra (quase
      nenhuma tem), e o placeholder ocupava mais espaço do que todo o resto
      do card junto. A capa continua no topo do relatório, onde é a arte do
      evento e tem função.

   2. A LISTA VIROU PRANCHA. Linha por campanha, densa, com o que diferencia
      uma da outra: período, verba usada, quantas demandas, quantas
      entregas, progresso dos marcos. Cabem doze campanhas onde cabiam
      duas — e dá para comparar de cima a baixo, que é o que uma lista
      serve para fazer.

   3. ENTROU UMA LINHA DO TEMPO. A pergunta "quando é o quê" não tinha
      resposta em lugar nenhum: as datas eram texto solto em cada card.
      Agora o calendário do ministério se lê de uma vez, com sobreposições
      visíveis.

   Nenhum número aqui é novo: demandas, entregas, progresso e gasto de mídia
   já estavam na view `campanha_perfil` e não apareciam antes de alguém
   abrir a campanha.
   ========================================================================= */

type SortKey = "cronologica" | "investimento" | "nome";

function periodLabel(c: CampaignCardData): string | null {
  if (c.dataEvento) return `Evento em ${formatarDiaMes(c.dataEvento, "")}`;
  const i = formatarDiaMes(c.dataInicio, "");
  const f = formatarDiaMes(c.dataTermino, "");
  if (i && f) return `${i} — ${f}`;
  return i || f || null;
}

function dataDeOrdem(c: CampaignCardData): string {
  return c.dataEvento ?? c.dataTermino ?? c.dataInicio ?? "";
}

/** Medidor de verba: barra fina com o aprovado como trilho. Acima de 100%
 *  a barra fica vermelha — estourar o orçamento é a leitura que importa. */
function Verba({ investimento, aprovado }: { investimento: number | null; aprovado: number | null }) {
  if (investimento == null && aprovado == null) {
    return <span className="text-caption text-ink-3">sem valor lançado</span>;
  }
  const pct = aprovado && aprovado > 0 && investimento != null ? (investimento / aprovado) * 100 : null;
  const estourou = pct != null && pct > 100;

  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-caption sm:justify-end">
        <span className="font-medium tabular-nums text-ink">{formatMoney(investimento, true)}</span>
        {aprovado != null && <span className="text-ink-3">de {formatMoney(aprovado, true)}</span>}
      </p>
      {pct != null && (
        <div className="mt-1 flex items-center gap-1.5 sm:justify-end">
          <span className="h-1 w-16 overflow-hidden rounded-full bg-neutral-soft">
            <span
              className={cn("block h-full rounded-full", estourou ? "bg-danger" : "bg-brand-500")}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </span>
          {/* Acima de 200% o percentual deixa de comunicar. "7.139%" lê-se
              como sete vírgula um, e o separador de milhar num percentual é
              ruído; "71× o aprovado" diz a mesma coisa de uma vez. */}
          <span className={cn("font-mono text-[0.625rem] tabular-nums", estourou ? "text-danger" : "text-ink-3")}>
            {pct > 200 ? `${Math.round(pct / 100)}× o aprovado` : formatPercent(pct, 0)}
          </span>
        </div>
      )}
    </div>
  );
}

function Linha({ c }: { c: CampaignCardData }) {
  const periodo = periodLabel(c);
  const emRisco = c.saude === "atencao" || c.saude === "critica";

  return (
    <BoardRow href={`/dashboard/campanhas/${c.id}`} tone={c.saude === "critica" ? "danger" : undefined}>
      {/* Duas colunas, não quatro. Com o trilho ao lado, a coluna principal
          tem ~770px: quatro blocos lado a lado truncavam todos, inclusive o
          nome da campanha — que é a única coisa que ninguém pode perder. */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate text-h4 text-ink">{c.nome}</span>
            {c.identificador && <CodeTag className="shrink-0">{c.identificador}</CodeTag>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-3">
            <Badge tone={saudeTone(c.saude)} size="sm" dot>
              {c.saudeLabel}
            </Badge>
            <span>{c.tipoLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{c.faseLabel}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-2">
            {periodo && (
              <span className="flex items-center gap-1.5">
                <Icon.Calendar className="h-3 w-3 shrink-0 text-ink-3" />
                {periodo}
              </span>
            )}
            {c.demandasTotal != null && c.demandasTotal > 0 && (
              <span>
                <span className="font-medium tabular-nums text-ink">{c.demandasTotal}</span>{" "}
                {c.demandasTotal === 1 ? "demanda" : "demandas"}
                {c.demandasConcluidas != null && c.demandasConcluidas > 0 && (
                  <span className="text-ink-3"> ({c.demandasConcluidas} concluídas)</span>
                )}
              </span>
            )}
            {c.entregasTotal != null && c.entregasTotal > 0 && (
              <span>
                <span className="font-medium tabular-nums text-ink">{c.entregasTotal}</span>{" "}
                {c.entregasTotal === 1 ? "material" : "materiais"}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 sm:w-44 sm:text-right">
          <Verba investimento={c.investimento} aprovado={c.orcamentoAprovado} />
          <p className="mt-1 flex flex-wrap gap-x-2 font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-3 sm:justify-end">
            {c.progressoMarcos != null && <span>{formatPercent(c.progressoMarcos, 0)} dos marcos</span>}
            {c.alcance != null && c.alcance > 0 && <span>{formatCompact(c.alcance)} de alcance</span>}
          </p>
        </div>
      </div>
      {emRisco && c.saude !== "critica" && (
        <span className="sr-only">Campanha exigindo atenção</span>
      )}
    </BoardRow>
  );
}

export function CampanhasExplorer({
  campaigns,
  hoje,
}: {
  campaigns: CampaignCardData[];
  hoje: string;
}) {
  const [busca, setBusca] = useState("");
  const [saude, setSaude] = useState("");
  const [tipo, setTipo] = useState("");
  const [ordem, setOrdem] = useState<SortKey>("cronologica");

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    const lista = campaigns.filter((c) => {
      const casaBusca =
        !termo ||
        normalizar(c.nome).includes(termo) ||
        (c.identificador ? normalizar(c.identificador).includes(termo) : false);
      return casaBusca && (!saude || c.saude === saude) && (!tipo || c.tipo === tipo);
    });

    return [...lista].sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordem === "investimento") return (b.investimento ?? -1) - (a.investimento ?? -1);
      // Cronológica: mais próximo de hoje primeiro, sem data por último.
      const da = dataDeOrdem(a);
      const db = dataDeOrdem(b);
      if (!da && !db) return a.nome.localeCompare(b.nome, "pt-BR");
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    });
  }, [campaigns, busca, saude, tipo, ordem]);

  const temFiltro = Boolean(busca.trim() || saude || tipo);

  // Totais do que está NA TELA — se o usuário filtrou, o resumo tem que
  // falar do recorte dele, senão os números do trilho contradizem a lista.
  const resumo = useMemo(() => {
    const comInvestimento = filtradas.filter((c) => c.investimento != null);
    return {
      total: filtradas.length,
      emRisco: filtradas.filter((c) => c.saude === "atencao" || c.saude === "critica").length,
      ativas: filtradas.filter((c) => c.saude !== "concluida").length,
      investimento: comInvestimento.reduce((s, c) => s + (c.investimento ?? 0), 0),
      comInvestimento: comInvestimento.length,
      demandas: filtradas.reduce((s, c) => s + (c.demandasTotal ?? 0), 0),
      entregas: filtradas.reduce((s, c) => s + (c.entregasTotal ?? 0), 0),
    };
  }, [filtradas]);

  // Agrupamento por situação: "exigindo atenção" primeiro é a ordem de
  // leitura de quem abre esta tela para trabalhar, não para navegar.
  const emRisco = filtradas.filter((c) => c.saude === "atencao" || c.saude === "critica");
  const andamento = filtradas.filter(
    (c) => c.saude !== "atencao" && c.saude !== "critica" && c.saude !== "concluida"
  );
  const concluidas = filtradas.filter((c) => c.saude === "concluida");

  return (
    <>
      <Toolbar>
        <SearchInput
          value={busca}
          onValueChange={setBusca}
          placeholder="Buscar campanha ou evento..."
          className="min-w-[12rem] flex-1 sm:max-w-xs"
        />
        <Select value={saude} onChange={(e) => setSaude(e.target.value)} aria-label="Filtrar por situação">
          <option value="">Todas as situações</option>
          {SAUDE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select value={ordem} onChange={(e) => setOrdem(e.target.value as SortKey)} aria-label="Ordenar">
          <option value="cronologica">Mais recentes</option>
          <option value="investimento">Maior investimento</option>
          <option value="nome">Nome</option>
        </Select>
        {temFiltro && (
          <span className="font-mono text-label uppercase text-ink-3">
            {filtradas.length} de {campaigns.length}
          </span>
        )}
      </Toolbar>

    <PageBody
      rail={
        <>
          <RailBlock label={temFiltro ? "No recorte atual" : "No total"}>
            <div className="divide-y divide-line">
              <RailStat
                label="Campanhas ativas"
                value={resumo.ativas}
                hint={
                  resumo.total !== resumo.ativas
                    ? `${resumo.total - resumo.ativas} já concluídas`
                    : undefined
                }
              />
              {resumo.emRisco > 0 && (
                <RailStat label="Exigindo atenção" value={resumo.emRisco} tone="warning" />
              )}
              <RailStat
                label="Investimento"
                value={resumo.comInvestimento > 0 ? formatMoney(resumo.investimento, true) : "—"}
                hint={
                  resumo.comInvestimento > 0
                    ? `em ${resumo.comInvestimento} de ${resumo.total}`
                    : "nenhum valor lançado"
                }
              />
              {resumo.demandas > 0 && (
                <RailStat
                  label="Produção vinculada"
                  value={resumo.demandas}
                  hint={`${resumo.entregas} ${resumo.entregas === 1 ? "material entregue" : "materiais entregues"}`}
                />
              )}
            </div>
          </RailBlock>
        </>
      }
    >
      {/* A linha do tempo só faz sentido com espaço horizontal: abaixo de
          `md` uma barra de 3% de largura é um traço sem leitura, e a lista
          logo abaixo já está em ordem cronológica. */}
      {filtradas.length > 1 && (
        <Panel
          title="Quando é o quê"
          description="Período de cada campanha, com a data do evento marcada"
          className="mb-4 hidden md:block"
        >
          <Timeline
            hoje={hoje}
            itens={filtradas.map((c) => ({
              id: c.id,
              nome: c.nome,
              inicio: c.dataInicio,
              termino: c.dataTermino,
              marco: c.dataEvento,
              saude: c.saude,
              saudeLabel: c.saudeLabel,
              href: `/dashboard/campanhas/${c.id}`,
            }))}
          />
        </Panel>
      )}

      {filtradas.length === 0 ? (
        <EmptyState
          icon={<Icon.Search className="h-5 w-5" />}
          title="Nenhuma campanha para este filtro"
          description="Tente outro termo de busca ou limpe os filtros para ver tudo de novo."
        />
      ) : (
        <Board>
          {emRisco.length > 0 && (
            <BoardGroup
              title="Exigindo atenção"
              count={emRisco.length}
              meta="Saúde marcada como atenção ou crítica"
            >
              {emRisco.map((c) => <Linha key={c.id} c={c} />)}
            </BoardGroup>
          )}
          {andamento.length > 0 && (
            <BoardGroup title="Em andamento" count={andamento.length}>
              {andamento.map((c) => <Linha key={c.id} c={c} />)}
            </BoardGroup>
          )}
          {concluidas.length > 0 && (
            <BoardGroup title="Concluídas" count={concluidas.length} collapsible defaultOpen={concluidas.length <= 6}>
              {concluidas.length === 0 ? (
                <BoardEmpty>Nenhuma campanha concluída.</BoardEmpty>
              ) : (
                concluidas.map((c) => <Linha key={c.id} c={c} />)
              )}
            </BoardGroup>
          )}
        </Board>
      )}
    </PageBody>
    </>
  );
}
