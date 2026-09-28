import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import { getDemandsForMinistry, summarizeDemands, isOverdue, STATUS_LABEL } from "@/lib/data/demands";
import { getCampaignsForMinistry, SAUDE_LABEL } from "@/lib/data/campaigns";
import { getDeliverablesForMinistry } from "@/lib/data/deliverables";
import { getUniversoComparacao } from "@/lib/data/campanhaPerfil";
import { getMidiaDoMinisterio } from "@/lib/data/midiaMinisterio";
import { countByStage, stageOf } from "@/lib/demandStages";
import { TIMEZONE, hoje, formatarDiaMes, formatarDataCompleta, somaDias } from "@/lib/dates";
import { lerMinisterio } from "@/lib/carteira";
import { variacao } from "@/lib/insights";
import { LeituraMinisterioPanel } from "@/components/intel/LeituraMinisterio";
import { statusTone, deliverableTone } from "@/lib/statusColors";
import { DELIVERABLE_STATUS_LABEL } from "@/lib/deliverableOptions";
import { Alert, Avatar, Badge, Board, BoardRow, Button, Icon, Panel, Section, EmptyState } from "@/components/ui";
import { StageBar } from "@/components/charts/StageBar";
import { StageColumns } from "@/components/charts/StageColumns";
import { agruparPorMesEEstagio } from "@/lib/demandSeries";
import { METRICS, formatByKey, formatCompact, formatMoney } from "@/lib/metricLanguage";
import { PERIODOS, contarNoPeriodo, lerPeriodo, manchete, resultadoDoPeriodo } from "@/lib/resultados";
import {
  alinharComparacao, contarPorTipo, insightsDaHome, metricasDisponiveis, publicoDoPeriodo, serieSemanal, valoresDa,
  type PontoSemanal,
} from "@/lib/home";
import { AttentionList } from "./AttentionList";
import { PeriodoResultados } from "./PeriodoResultados";
import { CampanhasDoPeriodo } from "./CampanhasDoPeriodo";
import { OrcamentoPorCampanha, type LinhaOrcamento } from "./OrcamentoPorCampanha";
import { KpiCard } from "./home/KpiCard";
import { GraficoEvolucao } from "./home/GraficoEvolucao";
import type { PontoGrafico, Valores } from "./home/GraficoEvolucaoImpl";
import { PublicoAlcancado } from "./home/PublicoAlcancado";
import { ProducaoEntregue } from "./home/ProducaoEntregue";
import { InsightsHome } from "./home/InsightsHome";

export const metadata = { title: "Início" };

// Saudação pelo horário de Brasília, não pelo fuso do servidor (que no
// Render roda em UTC).
function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", hour12: false }).format(new Date())
  );
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getTodayLabel() {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function valores(p: PontoSemanal): Valores {
  return {
    investimento: p.investimento,
    vendas: p.vendas,
    cpa: p.cpa,
    impressoes: p.impressoes,
    cliques: p.cliques,
    ctr: p.ctr,
  };
}

/* =========================================================================
   INÍCIO — a central de resultados do ministério
   -------------------------------------------------------------------------
   Lida de cima para baixo, em cinco níveis de peso:

     1. QUEM E QUANDO   saudação, o ministério, o período e contra o quê
     2. QUANTO          quatro KPIs com variação, "antes" e sparkline
     3. COMO EVOLUIU    o gráfico grande, semana a semana, comparável
     4. ONDE E QUEM     público alcançado, produção entregue, campanhas,
                        orçamento — e as frases que os números sustentam
     5. O DIA A DIA     andamento das demandas, pendências, material,
                        histórico

   O filtro de período vale para os níveis 2 a 4 (o bloco inteiro esmaece
   enquanto troca); o nível 5 é o estado de hoje e diz isso.

   DADOS. Tudo sai de fontes que já existiam: o perfil consolidado por
   campanha (view campanha_perfil), a série semanal e a demografia do
   Meta Ads (meta_ad_campaign_weekly / _demografia), demandas e entregas.
   Não há dado por canal no sistema — a mídia paga é o Meta Ads, sem
   separação entre Facebook e Instagram —, então a Home não mostra uma
   divisão por canal que teria de ser inventada: a distribuição que existe
   de verdade, por público, ocupa esse lugar.
   ========================================================================= */

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { ministry, user } = await requireMinistry();
  const periodo = lerPeriodo(searchParams?.periodo);

  const [demands, campaigns, deliverables, universoCarga] = await Promise.all([
    getDemandsForMinistry(ministry.id),
    getCampaignsForMinistry(ministry.id),
    getDeliverablesForMinistry(ministry.id),
    getUniversoComparacao(),
  ]);
  // Depende da lista de campanhas; roda assim que ela chega.
  const midiaCarga = await getMidiaDoMinisterio(campaigns.map((c) => c.id));

  const universo = universoCarga.ok ? universoCarga.dados : [];
  const comparacaoIndisponivel = !universoCarga.ok;
  const midia = midiaCarga.ok ? midiaCarga.dados : { semanal: [], demografia: [], sincronizadoEm: null };

  const hojeBr = hoje();
  const mesAtual = hojeBr.slice(0, 7);
  const leitura = lerMinisterio(ministry.id, universo);

  /* ------------------------------ período ------------------------------ */

  // Mesmo recorte de campanhas da aba Campanhas; números do perfil
  // consolidado, a mesma fonte do relatório de cada campanha.
  const idsVisiveis = new Set(campaigns.map((c) => c.id));
  const perfis = universo.filter((c) => idsVisiveis.has(c.id));
  const resultado = resultadoDoPeriodo(perfis, periodo, hojeBr);
  const { atual, anterior } = resultado;
  const defPeriodo = PERIODOS.find((p) => p.chave === periodo)!;
  const rotuloAnterior = resultado.janela.anterior ? `${defPeriodo.rotulo} anteriores` : null;
  const deltaRotulo = rotuloAnterior ? `vs. ${rotuloAnterior}` : undefined;
  const semComparacao = !anterior
    ? "todo o histórico, sem comparação"
    : anterior.eventos === 0
      ? "sem campanha no período anterior"
      : "sem este dado no período anterior";
  const frase = manchete(resultado, `aos ${defPeriodo.rotulo} anteriores`);
  // Sem campanha nenhuma, "escolha um período maior" não resolveria nada.
  const semNenhuma = perfis.length === 0;

  const legendaPeriodo = resultado.janela.anterior ? (
    <>
      Comparando com{" "}
      <span className="font-medium text-ink-2">
        {formatarDataCompleta(resultado.janela.anterior.inicio)} a{" "}
        {formatarDataCompleta(somaDias(resultado.janela.anterior.fim, -1))}
      </span>
    </>
  ) : (
    <>Todo o histórico, sem período de comparação</>
  );

  /* ------------------------------- mídia ------------------------------- */

  const idsAtuais = new Set(resultado.campanhas.map((c) => c.id));
  const idsAnteriores = new Set(resultado.campanhasAnteriores.map((c) => c.id));
  const serie = serieSemanal(midia.semanal, idsAtuais);
  const serieAnterior = serieSemanal(midia.semanal, idsAnteriores);
  const pontosGrafico: PontoGrafico[] = alinharComparacao(serie, serieAnterior).map((c) => ({
    semanaInicio: c.atual.semanaInicio,
    semanaFim: c.atual.semanaFim,
    atual: valores(c.atual),
    anterior: c.anterior ? valores(c.anterior) : null,
    anteriorInicio: c.anterior?.semanaInicio ?? null,
  }));
  const metricasGrafico = metricasDisponiveis(serie);
  const publico = publicoDoPeriodo(midia.demografia, idsAtuais);
  const temPublico = publico.genero.length > 0 || publico.idade.length > 0;

  const investimentoNaSerie = serie.reduce((t, p) => t + p.investimento, 0);

  /* ----------------------------- produção ------------------------------ */

  const concluidas = demands.filter((d) => d.data_conclusao && contarNoPeriodo([d.data_conclusao], resultado.janela).atual > 0);
  const entregues = deliverables.filter((e) => e.data_entrega && contarNoPeriodo([e.data_entrega], resultado.janela).atual > 0);
  const producao = {
    demandas: { total: concluidas.length, porTipo: contarPorTipo(concluidas.map((d) => d.tipo_servico)) },
    arquivos: { total: entregues.length, porTipo: contarPorTipo(entregues.map((e) => e.tipo_arquivo)) },
  };

  /* ----------------------------- orçamento ----------------------------- */

  const campanhasPorId = new Map(campaigns.map((c) => [c.id, c]));
  const linhasOrcamento: LinhaOrcamento[] = [];
  let semOrcamento = 0;
  for (const perfil of resultado.campanhas) {
    const c = campanhasPorId.get(perfil.id);
    const realizado = perfil.investimento ?? c?.investimento_realizado ?? null;
    if (realizado == null) continue;
    const aprovado = perfil.orcamentoAprovado ?? c?.orcamento_aprovado ?? null;
    const planejado = perfil.orcamentoPlanejado ?? c?.orcamento_planejado ?? null;
    const orcamento = aprovado && aprovado > 0 ? aprovado : planejado && planejado > 0 ? planejado : null;
    if (orcamento == null) {
      semOrcamento++;
      continue;
    }
    linhasOrcamento.push({
      id: perfil.id,
      nome: perfil.nome,
      orcamento,
      base: aprovado && aprovado > 0 ? "aprovado" : "planejado",
      realizado,
    });
  }

  /* ----------------------------- insights ------------------------------ */

  // A manchete já diz a variação de resultado e de custo; as duas frases
  // repetidas saem da lista quando ela aparece.
  const insights = insightsDaHome({
    resultado,
    rotuloAnterior: `aos ${defPeriodo.rotulo} anteriores`,
    serie,
    publico,
    orcamentos: linhasOrcamento,
    cpaMinisterio: leitura.cpaMediano,
    cpaReferencia: leitura.cpaReferencia,
  }).filter((i) => !frase || (i.id !== "var-resultados" && i.id !== "var-cpa"));

  /* ----------------------------- andamento ----------------------------- */

  const resumo = summarizeDemands(demands);
  const stages = countByStage(demands.map((d) => d.status));
  const composicao = agruparPorMesEEstagio(
    demands.map((d) => ({ prazo: d.prazo_acordado, stage: stageOf(d.status) })),
    mesAtual
  );
  const taxaConclusao = resumo.total > 0 ? (resumo.concluidas / resumo.total) * 100 : null;
  const campanhasRisco = campaigns.filter((c) => c.saude === "atencao" || c.saude === "critica");
  const atrasadas = demands.filter((d) => isOverdue(d, hojeBr));
  const aguardando = demands.filter((d) =>
    ["aguardando_ministerio", "aguardando_aprovacao", "ajustes_solicitados"].includes(d.status)
  );
  const proximosPrazos = demands
    .filter((d) => d.prazo_acordado && !isOverdue(d, hojeBr) && d.status !== "concluida" && d.status !== "cancelada")
    .sort((a, b) => (a.prazo_acordado ?? "").localeCompare(b.prazo_acordado ?? ""))
    .slice(0, 5);
  const arquivosRecentes = deliverables.slice(0, 4);
  const temAtencao = atrasadas.length > 0 || aguardando.length > 0 || campanhasRisco.length > 0;

  const primeiroNome = user.fullName?.trim().split(/\s+/)[0] ?? null;

  const campanhasDoPeriodo = resultado.campanhas.map((c) => ({
    id: c.id,
    nome: c.nome,
    dataReferencia: c.dataReferencia,
    saude: c.saude,
    investimento: c.investimento,
    resultados: c.vendas,
    custoPorResultado: c.cpa,
    alcance: c.alcance,
  }));

  const anteriorFmt = (v: number | null | undefined, f: (n: number) => string) =>
    anterior && anterior.eventos > 0 && v != null ? f(v) : null;

  return (
    <div>
      <PeriodoResultados
        periodo={periodo}
        legenda={legendaPeriodo}
        header={
          <div className="flex items-start gap-4">
            <Avatar
              name={ministry.sigla || ministry.name}
              src={ministry.capa_url}
              size="lg"
              className="hidden shrink-0 sm:flex"
            />
            <div className="min-w-0">
              <p className="text-body-lg text-ink-2">
                {getGreeting()}
                {primeiroNome ? `, ${primeiroNome}` : ""}{" "}
                <span aria-hidden="true">👋</span>
              </p>
              <h1 className="mt-1 text-h1 text-ink">{ministry.name}</h1>
              <p className="mt-1.5 max-w-prose text-body text-ink-2">
                Veja como está o desempenho do seu marketing
                {resultado.janela.inicio ? ` desde ${formatarDataCompleta(resultado.janela.inicio)}` : ""}.
              </p>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-3">
                <span className="inline-flex items-center gap-1.5">
                  <Icon.Calendar className="h-3.5 w-3.5" />
                  {getTodayLabel()}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon.Megaphone className="h-3.5 w-3.5" />
                  {atual.eventos} {atual.eventos === 1 ? "campanha no período" : "campanhas no período"}
                </span>
                {midia.sincronizadoEm && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon.Refresh className="h-3.5 w-3.5" />
                    Mídia atualizada em {dataHora(midia.sincronizadoEm)}
                  </span>
                )}
              </p>
            </div>
          </div>
        }
      >
        {/* O que pede ação não fica escondido lá embaixo, no andamento. */}
        {(aguardando.length > 0 || atrasadas.length > 0) && (
          <Link
            href="#andamento"
            className="mb-6 flex items-center gap-2.5 rounded-card border border-warning-line bg-warning-soft px-4 py-2.5 text-small text-ink transition-colors hover:border-warning"
          >
            <Icon.AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span className="min-w-0 flex-1">
              {[
                aguardando.length > 0 &&
                  `${aguardando.length} ${aguardando.length === 1 ? "demanda espera" : "demandas esperam"} sua resposta`,
                atrasadas.length > 0 && `${atrasadas.length} ${atrasadas.length === 1 ? "atrasada" : "atrasadas"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="hidden text-caption font-medium text-ink-2 sm:inline">Ver pendências</span>
            <Icon.ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
          </Link>
        )}

        {comparacaoIndisponivel ? (
          <Alert tone="warning" title="Os números das campanhas não carregaram agora" className="mb-section">
            O andamento das demandas, mais abaixo, está atualizado. Recarregue em alguns instantes; se continuar,
            avise a Comunicação.
          </Alert>
        ) : atual.eventos === 0 ? (
          <EmptyState
            className="mb-section"
            icon={<Icon.BarChart className="h-5 w-5" />}
            title={semNenhuma ? "Nenhuma campanha publicada ainda" : "Não há dados suficientes para este período"}
            description={
              semNenhuma
                ? "Quando a Comunicação publicar a primeira campanha ou evento, investimento, alcance e resultados aparecem aqui."
                : "Não há campanha ou evento com data neste recorte. Escolha um período maior no seletor acima para ver o histórico."
            }
            action={
              !semNenhuma ? (
                <Link href="?periodo=tudo">
                  <Button variant="secondary" size="sm">
                    Ver todo o histórico
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* ======================= 2. KPIs ======================= */}
            <section aria-label="Indicadores principais" className="mb-4">
              {frase && (
                <p className="mb-4 flex items-start gap-2.5 rounded-card bg-brand-50 px-4 py-3 text-body text-ink dark:bg-brand-900/25">
                  <Icon.Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                  <span>{frase}</span>
                </p>
              )}
              {/* Celular: carrossel com encaixe, cada cartão com a ponta do
                  próximo à vista (é o que avisa que há mais). Quatro cartões
                  empilhados passavam de mil pixels antes do gráfico. A
                  partir de 520px, grade: 2 colunas, depois 4. */}
              <div
                role="region"
                aria-label="Indicadores do período — role para o lado para ver todos"
                tabIndex={0}
                className="signal-stagger -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 outline-none focus-visible:shadow-focus min-[520px]:mx-0 min-[520px]:grid min-[520px]:grid-cols-2 min-[520px]:gap-4 min-[520px]:overflow-visible min-[520px]:px-0 min-[520px]:pb-0 xl:grid-cols-4"
              >
                <KpiCard
                  className="w-[82%] shrink-0 snap-start min-[520px]:w-auto"
                  rotulo={METRICS.investimento.plainLabel}
                  ajuda={METRICS.investimento.description}
                  icone={<Icon.Wallet className="h-4 w-4" />}
                  cor="investimento"
                  valor={atual.investimento}
                  formato="money-compact"
                  vazio="nenhum valor lançado"
                  delta={resultado.variacao.investimento}
                  deltaNeutro
                  deltaRotulo={deltaRotulo}
                  semComparacao={semComparacao}
                  anterior={anteriorFmt(anterior?.investimento, (v) => formatMoney(v, true))}
                  contexto={`em ${resultado.campanhas.filter((c) => c.investimento != null).length} de ${atual.eventos} campanhas`}
                  serie={serie.length > 1 ? valoresDa(serie, "investimento") : undefined}
                />
                <KpiCard
                  className="w-[82%] shrink-0 snap-start min-[520px]:w-auto"
                  rotulo={METRICS.alcance.plainLabel}
                  ajuda={`${METRICS.alcance.description} Aqui é a soma do alcance de cada campanha: quem viu duas campanhas conta duas vezes.`}
                  icone={<Icon.Users className="h-4 w-4" />}
                  cor="alcance"
                  valor={atual.alcance}
                  formato="compact"
                  vazio="sem mídia paga vinculada"
                  delta={resultado.variacao.alcance}
                  deltaRotulo={deltaRotulo}
                  semComparacao={semComparacao}
                  anterior={anteriorFmt(anterior?.alcance, formatCompact)}
                  contexto={`em ${atual.comMidia} ${atual.comMidia === 1 ? "campanha" : "campanhas"} com mídia`}
                />
                <KpiCard
                  className="w-[82%] shrink-0 snap-start min-[520px]:w-auto"
                  rotulo={METRICS.vendas.label}
                  ajuda={METRICS.vendas.description}
                  icone={<Icon.Target className="h-4 w-4" />}
                  cor="resultados"
                  valor={atual.resultados}
                  formato="integer"
                  vazio="sem conversão rastreada"
                  delta={resultado.variacao.resultados}
                  deltaRotulo={deltaRotulo}
                  semComparacao={semComparacao}
                  anterior={anteriorFmt(anterior?.resultados, (v) => Math.round(v).toLocaleString("pt-BR"))}
                  contexto="conversões registradas"
                  serie={serie.length > 1 ? valoresDa(serie, "vendas") : undefined}
                />
                <KpiCard
                  className="w-[82%] shrink-0 snap-start min-[520px]:w-auto"
                  rotulo={METRICS.cpa.label}
                  ajuda={METRICS.cpa.description}
                  icone={<Icon.Gauge className="h-4 w-4" />}
                  cor="custo"
                  valor={atual.custoPorResultado}
                  formato="money-precise"
                  vazio="exige investimento e resultado"
                  delta={resultado.variacao.custoPorResultado}
                  deltaInverso
                  deltaRotulo={deltaRotulo}
                  semComparacao={semComparacao}
                  anterior={anteriorFmt(anterior?.custoPorResultado, (v) => formatByKey("cpa", v))}
                  contexto="quanto custou cada resultado"
                  serie={serie.length > 1 ? valoresDa(serie, "cpa") : undefined}
                />
              </div>

              {/* Indicadores de apoio — sem caixa, numa faixa. */}
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 rounded-panel border border-line bg-surface-sunken/60 px-5 py-4 sm:grid-cols-4">
                <FaixaNumero
                  rotulo={METRICS.impressoes.plainLabel}
                  valor={formatCompact(atual.impressoes)}
                  delta={anterior && anterior.eventos > 0 ? variacao(atual.impressoes, anterior.impressoes) : null}
                />
                <FaixaNumero
                  rotulo={METRICS.cliques.plainLabel}
                  valor={formatCompact(atual.cliques)}
                  delta={anterior && anterior.eventos > 0 ? variacao(atual.cliques, anterior.cliques) : null}
                />
                <FaixaNumero
                  rotulo={METRICS.ctr.plainLabel}
                  valor={formatByKey("ctr", atual.ctr)}
                  delta={anterior && anterior.eventos > 0 ? variacao(atual.ctr, anterior.ctr) : null}
                />
                <FaixaNumero
                  rotulo="Entregas da Comunicação"
                  valor={`${producao.demandas.total + producao.arquivos.total}`}
                  sub={`${producao.demandas.total} demandas · ${producao.arquivos.total} arquivos`}
                />
              </dl>
            </section>

            {/* =================== 3. EVOLUÇÃO =================== */}
            <Panel
              className="mb-4"
              title="Evolução semana a semana"
              description={
                serie.length > 0
                  ? `Mídia paga das ${idsAtuais.size} campanhas do período, somada por semana`
                  : "Mídia paga das campanhas do período"
              }
            >
              {!midiaCarga.ok ? (
                <EmptyState
                  size="sm"
                  icon={<Icon.AlertTriangle className="h-4 w-4" />}
                  title="A série semanal não carregou agora"
                  description="Os totais acima estão corretos; só o gráfico ficou de fora. Recarregue em alguns instantes."
                />
              ) : serie.length < 2 ? (
                <EmptyState
                  size="sm"
                  icon={<Icon.Activity className="h-4 w-4" />}
                  title="Não há semanas suficientes para uma evolução"
                  description={
                    serie.length === 0
                      ? "Nenhuma campanha deste período tem mídia paga do Meta Ads com histórico semanal. Escolha um período maior acima, ou veja os números por campanha abaixo."
                      : "Só uma semana de mídia neste período. Escolha um período maior para ver a evolução."
                  }
                />
              ) : (
                <>
                  <GraficoEvolucao pontos={pontosGrafico} metricas={metricasGrafico} rotuloAnterior={rotuloAnterior} />
                  {atual.investimento != null && investimentoNaSerie < atual.investimento * 0.98 && (
                    <p className="mt-3 border-t border-line pt-3 text-caption text-ink-3">
                      O gráfico cobre {formatMoney(investimentoNaSerie, true)} de {formatMoney(atual.investimento, true)} investidos: o
                      restante foi lançado à mão, sem histórico por semana.
                    </p>
                  )}
                </>
              )}
            </Panel>

            {/* ============ 4. PÚBLICO E PRODUÇÃO ============ */}
            <div className="mb-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              <Panel title="Público alcançado" description="Quem recebeu a mídia paga do período">
                {temPublico ? (
                  <PublicoAlcancado publico={publico} />
                ) : (
                  <EmptyState
                    size="sm"
                    icon={<Icon.Users className="h-4 w-4" />}
                    title="Sem dados de público neste período"
                    description="A divisão por gênero e idade vem do Meta Ads e aparece quando uma campanha do período tem mídia paga vinculada."
                  />
                )}
              </Panel>
              <Panel title="Produção entregue" description="O que a Comunicação concluiu no período, por tipo">
                <ProducaoEntregue demandas={producao.demandas} arquivos={producao.arquivos} />
              </Panel>
            </div>

            {/* ============ CAMPANHAS E ORÇAMENTO ============ */}
            <div className="mb-section grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <Panel noPadding>
                <CampanhasDoPeriodo campanhas={campanhasDoPeriodo} />
              </Panel>
              <Panel title="Orçamento × realizado" description="Quanto de cada orçamento já foi usado">
                <OrcamentoPorCampanha linhas={linhasOrcamento} semOrcamento={semOrcamento} />
              </Panel>
            </div>

            {/* ================= INSIGHTS ================= */}
            <Section
              eyebrow="Leitura automática"
              title="O que os números mostram"
              description="Frases geradas a partir dos dados deste período. Cada uma diz em que base foi calculada."
              className="mb-section"
            >
              <InsightsHome insights={insights} />
            </Section>
          </>
        )}

        {/* Mesmo sem campanha no período, o que foi produzido existe. */}
        {atual.eventos === 0 && !comparacaoIndisponivel && (producao.demandas.total > 0 || producao.arquivos.total > 0) && (
          <Panel className="mb-section" title="Produção entregue" description="O que a Comunicação concluiu no período, por tipo">
            <ProducaoEntregue demandas={producao.demandas} arquivos={producao.arquivos} />
          </Panel>
        )}
      </PeriodoResultados>

      {/* ======================= 5. O DIA A DIA ======================= */}
      <Section
        id="andamento"
        eyebrow="Andamento"
        title="Em que pé está o trabalho"
        description="As demandas deste ministério hoje — sem recorte de período."
        action={
          resumo.total > 0 ? (
            <Link
              href="/dashboard/demandas"
              className="inline-flex min-h-6 items-center text-caption text-brand-600 underline-offset-4 hover:underline"
            >
              {resumo.total} {resumo.total === 1 ? "demanda" : "demandas"} de 2026 em diante
            </Link>
          ) : undefined
        }
        className="mb-section scroll-mt-20"
      >
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {resumo.total === 0 ? (
              <EmptyState
                icon={<Icon.ListChecks className="h-5 w-5" />}
                title="Nenhuma demanda ainda"
                description="Assim que a Comunicação publicar as primeiras demandas deste ministério, elas aparecem aqui."
              />
            ) : (
              <>
                <div className="rounded-panel border border-line bg-surface p-4 shadow-xs sm:p-5">
                  <StageBar stages={stages} total={resumo.total} height="h-9" />
                  <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                    <NumeroDeAbertura label="Em andamento" valor={resumo.emAndamento} hint="fila, produção e com você" />
                    <NumeroDeAbertura
                      label="Com você"
                      valor={resumo.comMinisterio}
                      hint="esperando resposta do ministério"
                      tone={resumo.comMinisterio > 0 ? "warning" : "default"}
                      href="/dashboard/demandas"
                    />
                    <NumeroDeAbertura
                      label="Atrasadas"
                      valor={resumo.atrasadas}
                      hint="prazo já vencido"
                      tone={resumo.atrasadas > 0 ? "danger" : "default"}
                      href="/dashboard/demandas"
                    />
                    <NumeroDeAbertura
                      label="Concluídas"
                      valor={resumo.concluidas}
                      hint={taxaConclusao == null ? undefined : `${taxaConclusao.toFixed(0)}% do total`}
                    />
                  </div>
                </div>
                {composicao.length > 1 && (
                  <Panel title="Onde está o trabalho" description="Demandas por mês de prazo, divididas por estágio">
                    <StageColumns colunas={composicao} className="pt-4" altura={148} />
                  </Panel>
                )}
              </>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <div>
              <p className="mb-2 font-mono text-label uppercase text-ink-3">Precisa de atenção</p>
              {temAtencao ? (
                <Board>
                  <AttentionList
                    atrasadas={atrasadas.slice(0, 4).map((d) => ({
                      id: d.id,
                      titulo: d.titulo,
                      meta: `venceu em ${formatarDiaMes(d.prazo_acordado)}`,
                    }))}
                    atrasadasTotal={atrasadas.length}
                    aguardando={aguardando.slice(0, 4).map((d) => ({
                      id: d.id,
                      titulo: d.titulo,
                      meta: STATUS_LABEL[d.status] ?? d.status,
                    }))}
                    aguardandoTotal={aguardando.length}
                    campanhas={campanhasRisco.slice(0, 3).map((c) => ({
                      id: c.id,
                      titulo: c.nome,
                      meta: SAUDE_LABEL[c.saude] ?? c.saude,
                      critica: c.saude === "critica",
                    }))}
                    campanhasTotal={campanhasRisco.length}
                  />
                </Board>
              ) : (
                <div className="flex flex-col items-center rounded-panel border border-line bg-surface px-4 py-8 text-center shadow-xs">
                  <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
                    <Icon.CheckCircle className="h-5 w-5" />
                  </span>
                  <p className="text-h4 text-ink">Tudo em dia</p>
                  <p className="mt-1 max-w-[16rem] text-caption text-ink-2">
                    Nenhuma demanda atrasada, nada esperando por você e nenhuma campanha em risco.
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-mono text-label uppercase text-ink-3">Próximos prazos</p>
                <Link
                  href="/dashboard/demandas"
                  className="inline-flex min-h-6 items-center text-caption text-brand-600 underline-offset-4 hover:underline"
                >
                  ver todas
                </Link>
              </div>
              <Board>
                {proximosPrazos.length === 0 ? (
                  <p className="px-4 py-6 text-center text-caption text-ink-3">Nenhum prazo em aberto no momento.</p>
                ) : (
                  proximosPrazos.map((d) => (
                    <BoardRow key={d.id} href={`/dashboard/demandas/${d.id}`}>
                      <span className="block truncate text-small font-medium text-ink">{d.titulo}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-caption text-ink-3">
                        <Icon.Calendar className="h-3 w-3" />
                        {formatarDiaMes(d.prazo_acordado)}
                        <Badge tone={statusTone(d.status)} size="sm" dot>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </Badge>
                      </span>
                    </BoardRow>
                  ))
                )}
              </Board>
            </div>
          </div>
        </div>
      </Section>

      {/* ================= MATERIAL E HISTÓRICO ================= */}
      <div className="grid grid-cols-1 items-start gap-x-4 gap-y-section xl:grid-cols-2">
        <Section
          eyebrow="Material"
          title="Entregue por último"
          action={
            <Link
              href="/dashboard/entregas"
              className="inline-flex min-h-6 items-center text-caption text-brand-600 underline-offset-4 hover:underline"
            >
              ver todos os arquivos
            </Link>
          }
        >
          <Board>
            {arquivosRecentes.length === 0 ? (
              <p className="px-4 py-6 text-center text-caption text-ink-3">Nenhum arquivo registrado ainda.</p>
            ) : (
              arquivosRecentes.map((e) => (
                <BoardRow
                  key={e.id}
                  href={e.link_principal ?? "/dashboard/entregas"}
                  leading={
                    <span className="flex h-7 w-7 items-center justify-center rounded-control bg-neutral-soft text-ink-3">
                      <Icon.File className="h-3.5 w-3.5" />
                    </span>
                  }
                >
                  <span className="block truncate text-small font-medium text-ink">{e.titulo}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-ink-3">
                    <span className="truncate">
                      {e.tipo_arquivo ?? "arquivo"}
                      {e.versao ? ` · v${e.versao}` : ""}
                      {e.data_entrega ? ` · ${formatarDiaMes(e.data_entrega)}` : ""}
                    </span>
                    <Badge tone={deliverableTone(e.status)} size="sm">
                      {DELIVERABLE_STATUS_LABEL[e.status] ?? e.status}
                    </Badge>
                  </span>
                </BoardRow>
              ))
            )}
          </Board>
        </Section>

        <Section eyebrow="Histórico" title="Como os eventos vêm evoluindo">
          <Panel>
            {comparacaoIndisponivel ? (
              <EmptyState
                size="sm"
                icon={<Icon.AlertTriangle className="h-4 w-4" />}
                title="Não foi possível carregar a comparação"
                description="Os números das campanhas não vieram agora. Atualize a página; se continuar, avise a Comunicação."
              />
            ) : (
              <LeituraMinisterioPanel leitura={leitura} />
            )}
          </Panel>
        </Section>
      </div>
    </div>
  );
}

/* Número da faixa de apoio: sem caixa própria — a faixa inteira é a
   caixa, e os quatro números se separam pelo espaço. */
function FaixaNumero({ rotulo, valor, delta, sub }: { rotulo: string; valor: string; delta?: number | null; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-caption text-ink-3">{rotulo}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-h3 font-semibold tabular-nums text-ink">{valor}</span>
        {delta != null && <DeltaPequeno valor={delta} />}
        {sub && <span className="w-full truncate text-[0.6875rem] text-ink-3">{sub}</span>}
      </dd>
    </div>
  );
}

function DeltaPequeno({ valor }: { valor: number }) {
  const sobe = valor > 0;
  const flat = Math.abs(valor) < 0.5;
  return (
    <span className={flat ? "text-caption text-ink-3" : sobe ? "text-caption font-medium text-success" : "text-caption font-medium text-danger"}>
      {flat ? "estável" : `${sobe ? "↑" : "↓"} ${Math.abs(Math.round(valor))}%`}
    </span>
  );
}

/* Número de abertura: sem caixa, sem ícone, sem borda. O que separa um do
   outro é o espaço, e o que os hierarquiza é o tamanho — não mais um
   retângulo em volta de cada. */
function NumeroDeAbertura({
  label,
  valor,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  valor: number;
  hint?: string;
  tone?: "default" | "warning" | "danger";
  href?: string;
}) {
  const cor = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink";
  const corpo = (
    <>
      <p className="font-mono text-label uppercase text-ink-3">{label}</p>
      <p className={`mt-1 text-metric tabular-nums lg:text-metric-lg ${cor}`}>{valor}</p>
      {hint && <p className="mt-0.5 text-caption text-ink-3">{hint}</p>}
    </>
  );
  if (href && valor > 0) {
    return (
      <a href={href} className="-mx-2 block rounded-control px-2 py-1 transition-colors duration-120 hover:bg-surface-sunken">
        {corpo}
      </a>
    );
  }
  return <div className="px-0 py-1">{corpo}</div>;
}
