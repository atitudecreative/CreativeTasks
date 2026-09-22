"use client";

import Link from "next/link";
import {
  Alert, Badge, CodeTag, Divider, EmptyState, Icon, Metric, MetricRow,
  Panel, Progress, Section, Tooltip, cn,
} from "@/components/ui";
import { DeliverableCard } from "@/components/DeliverableCard";
import { StageBar } from "@/components/charts/StageBar";
import { MilestoneTimeline } from "./MilestoneTimeline";
import { MetaWeeklyChart, MetaGenderChart, MetaAgeChart, MetaAdsRanking } from "./MetaAdsCharts";
import { MetaAdsTable } from "./MetaAdsTable";
import { ReportNav, type ReportSection } from "./ReportNav";
import { InsightList, InsightResumo } from "@/components/intel/InsightList";
import { ComparacaoPanel } from "@/components/intel/ComparacaoPanel";
import type { ResultadoInsights, LinhaComparacao } from "@/lib/insights";
import { WeekPerformance } from "./WeekFilter";
import { METRICS, formatMoney, formatCompact } from "@/lib/metricLanguage";
import { statusTone, saudeTone } from "@/lib/statusColors";
import { countByStage } from "@/lib/demandStages";
import { STATUS_LABEL } from "@/lib/demandOptions";
// Rótulos vêm do arquivo PURO (campaignOptions), não de lib/data/campaigns:
// aquele importa createClient -> next/headers, e um "use client" que puxe
// qualquer VALOR de lá arrasta o import de servidor pro bundle e quebra o
// build. O tipo abaixo entra como `import type`, que o compilador apaga.
import { SAUDE_LABEL, TIPO_LABEL, FASE_LABEL } from "@/lib/campaignOptions";
import type { Milestone } from "@/lib/data/campaigns";
import type { MetaMetricsSummary } from "@/lib/metaAdsMath";
import type { MetaAdCampaign, MetaAd, MetaWeeklyStat, MetaDemographicItem } from "@/lib/data/metaAds";
import type { Deliverable } from "@/lib/data/deliverables";

export type DemandListItem = {
  id: string;
  titulo: string;
  status: string;
  prazo_acordado: string | null;
  overdue: boolean;
};

function formatDate(dateStr: string | null, long = false) {
  if (!dateStr) return "não definido";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: long ? "long" : "short",
    year: "numeric",
  });
}

/** Período por extenso — "12 de março a 4 de abril de 2026" lê melhor que
 *  duas datas soltas em campos separados, e é assim que um relatório fala. */
function periodText(inicio: string | null, termino: string | null): string | null {
  if (!inicio && !termino) return null;
  if (inicio && termino) return `${formatDate(inicio, true)} — ${formatDate(termino, true)}`;
  return formatDate(inicio ?? termino, true);
}

function Fact({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 font-mono text-label uppercase text-ink-3">
        {hint ? (
          <Tooltip content={hint}>
            <span className="cursor-help underline decoration-dotted underline-offset-2">{label}</span>
          </Tooltip>
        ) : (
          label
        )}
      </p>
      <div className="text-small text-ink">{children}</div>
    </div>
  );
}

/* =========================================================================
   RELATÓRIO DE CAMPANHA / EVENTO
   -------------------------------------------------------------------------
   Esta é a tela que o cliente recebe. Ela foi reconstruída como DOCUMENTO,
   não como painel de abas.

   O problema da versão anterior não era estético. "Objetivo estratégico",
   "escopo macro", período e orçamento — ou seja, o que responde "o que foi
   feito e quanto custou" — ficavam dentro da aba MARCOS, atrás de dois
   cliques. Quem abria o relatório via primeiro uma fileira de KPIs
   misturando contagem de demanda com verba de anúncio, sem separação.

   A ordem agora segue as perguntas da prestação de contas:

     1. RESUMO       o que foi esse evento, em uma tela
     2. RESULTADO    quanto custou e o que voltou
     3. MÍDIA        como a verba se comportou ao longo do tempo e do público
     4. ENTREGA      o que a Comunicação produziu e entregou
     5. REGISTRO     marcos, demandas e o dado bruto

   Tudo vive na mesma página: imprime inteiro, acha no Ctrl+F, rola numa
   leitura só.
   ========================================================================= */

export function CampaignReport({
  campaignNome, identificador, tipo, fase, saude, publicada, capaUrl,
  objetivoEstrategico, escopoMacro, dataInicio, dataTermino, dataEvento,
  orcamentoPlanejado, orcamentoAprovado, investimentoRealizado, resultadosObservacoes,
  resumoDemandas, demandasOrdenadas, progress, proximoMarco, milestones,
  deliverables, canApprove,
  metaCampaigns, metaMetrics, metaWeekly, metaDemographics, metaAds,
  leitura, comparacoes, comparacaoIndisponivel,
}: {
  campaignNome: string;
  identificador: string | null;
  tipo: string;
  fase: string;
  saude: string;
  publicada: boolean;
  capaUrl: string | null;
  objetivoEstrategico: string | null | undefined;
  escopoMacro: string | null | undefined;
  dataInicio: string | null;
  dataTermino: string | null;
  dataEvento: string | null;
  orcamentoPlanejado: number | null;
  orcamentoAprovado: number | null;
  investimentoRealizado: number | null;
  resultadosObservacoes: string | null | undefined;
  resumoDemandas: { total: number; concluidas: number; atrasadas: number; emAndamento: number };
  demandasOrdenadas: DemandListItem[];
  progress: number | null;
  proximoMarco: Milestone | undefined;
  milestones: Milestone[];
  deliverables: Deliverable[];
  canApprove: boolean;
  metaCampaigns: MetaAdCampaign[];
  metaMetrics: MetaMetricsSummary;
  metaWeekly: MetaWeeklyStat[];
  metaDemographics: { genero: MetaDemographicItem[]; idade: MetaDemographicItem[] };
  metaAds: MetaAd[];
  /** Leitura automática (motor de insights) — calculada no servidor a
   *  partir da view campanha_perfil e das campanhas comparáveis. */
  leitura: ResultadoInsights;
  comparacoes: LinhaComparacao[];
  /** A leitura automática não pôde ser carregada (falha de consulta, não
   *  falta de dado). Sem isso, a tela diria "dados insuficientes" — que
   *  significa outra coisa. */
  comparacaoIndisponivel?: boolean;
}) {
  const hasMeta = metaCampaigns.length > 0;
  const periodo = periodText(dataInicio, dataTermino);
  const stages = countByStage(demandasOrdenadas.map((d) => d.status));

  // Investimento: o número de mídia, quando existe, é o realizado de
  // verdade; senão cai no que foi lançado manualmente na campanha.
  const investimento = hasMeta ? metaMetrics.investimento : investimentoRealizado;
  const usoOrcamento =
    orcamentoAprovado && orcamentoAprovado > 0 && investimento != null
      ? (investimento / orcamentoAprovado) * 100
      : null;

  const temLeitura = leitura.insights.length > 0 || comparacoes.length > 0 || leitura.dadosInsuficientes;

  const sections: ReportSection[] = [
    { id: "resumo", label: "Resumo", icon: "Sparkles" },
    ...(temLeitura ? [{ id: "leitura", label: "Leitura", icon: "Activity" as const }] : []),
    ...(hasMeta || investimento != null || orcamentoAprovado != null
      ? [{ id: "resultado", label: "Resultado", icon: "Target" as const }]
      : []),
    ...(hasMeta ? [{ id: "midia", label: "Mídia", icon: "Megaphone" as const }] : []),
    ...(deliverables.length > 0 ? [{ id: "entregas", label: "Entregas", icon: "Folder" as const }] : []),
    { id: "registro", label: "Registro", icon: "ListChecks" },
  ];

  return (
    <div>
      {/* ================= CAPA ================= */}
      <div className="mb-5 overflow-hidden rounded-panel border border-line bg-surface shadow-xs" data-print-block="">
        {capaUrl ? (
          <div className="relative">
            <div
              className="h-36 w-full bg-cover bg-center sm:h-48"
              style={{ backgroundImage: `url(${capaUrl})` }}
              role="img"
              aria-label={`Arte de capa de ${campaignNome}`}
            />
            {/* Véu só no rodapé da imagem — o suficiente pra tarja de
                status ficar legível sobre capa clara, sem lavar a arte. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-3 left-4 flex flex-wrap gap-1.5 sm:left-5">
              <Badge tone={saudeTone(saude)} variant="solid" size="sm">
                {SAUDE_LABEL[saude] ?? saude}
              </Badge>
              {!publicada && (
                <Badge tone="neutral" variant="solid" size="sm" icon={<Icon.EyeOff className="h-3 w-3" />}>
                  Oculta para o ministério
                </Badge>
              )}
            </div>
          </div>
        ) : null}

        <div className="p-4 sm:p-5">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {identificador && <CodeTag>{identificador}</CodeTag>}
            <Badge tone="neutral" size="sm">
              {TIPO_LABEL[tipo] ?? tipo}
            </Badge>
            {!capaUrl && (
              <>
                <Badge tone={saudeTone(saude)} size="sm" dot>
                  {SAUDE_LABEL[saude] ?? saude}
                </Badge>
                {!publicada && (
                  <Badge tone="neutral" size="sm" icon={<Icon.EyeOff className="h-3 w-3" />}>
                    Oculta
                  </Badge>
                )}
              </>
            )}
          </div>

          <h1 className="text-h1 text-ink">{campaignNome}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-2">
            {periodo && (
              <span className="flex items-center gap-1.5">
                <Icon.Calendar className="h-3.5 w-3.5 text-ink-3" />
                {periodo}
              </span>
            )}
            {dataEvento && (
              <span className="flex items-center gap-1.5">
                <Icon.Flag className="h-3.5 w-3.5 text-ink-3" />
                Evento em {formatDate(dataEvento, true)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Icon.Activity className="h-3.5 w-3.5 text-ink-3" />
              {FASE_LABEL[fase] ?? fase}
            </span>
          </div>
        </div>
      </div>

      <ReportNav sections={sections} ads={metaAds} campaignNome={campaignNome} />

      <div className="space-y-section">
        {/* ================= 1. RESUMO ================= */}
        <Section
          id="resumo"
          as="div"
          eyebrow="Resumo executivo"
          title="O que foi este evento"
          className="scroll-mt-28"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              {objetivoEstrategico || escopoMacro ? (
                <div className="space-y-4">
                  {objetivoEstrategico && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-label uppercase text-ink-3">
                        <Icon.Target className="h-3.5 w-3.5" />
                        Objetivo
                      </p>
                      <p className="whitespace-pre-line text-body-lg leading-relaxed text-ink">{objetivoEstrategico}</p>
                    </div>
                  )}
                  {escopoMacro && (
                    <>
                      {objetivoEstrategico && <Divider />}
                      <div>
                        <p className="mb-1.5 flex items-center gap-1.5 font-mono text-label uppercase text-ink-3">
                          <Icon.Layers className="h-3.5 w-3.5" />
                          Escopo
                        </p>
                        <p className="whitespace-pre-line leading-relaxed text-ink-2">{escopoMacro}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <EmptyState
                  size="sm"
                  icon={<Icon.Target className="h-4 w-4" />}
                  title="Objetivo ainda não descrito"
                  description="A Comunicação pode preencher objetivo e escopo na edição da campanha, e eles aparecem aqui no relatório."
                />
              )}
            </Panel>

            <Panel title="Ficha da campanha">
              <div className="space-y-3.5">
                <Fact label="Progresso">
                  {progress !== null ? (
                    <Progress value={progress} tone={progress === 100 ? "success" : "accent"} />
                  ) : (
                    <span className="text-ink-3">sem marcos definidos</span>
                  )}
                </Fact>
                {proximoMarco && <Fact label="Próximo marco">{proximoMarco.nome}</Fact>}
                <Divider />
                <Fact label="Peças produzidas">
                  {resumoDemandas.total} {resumoDemandas.total === 1 ? "demanda" : "demandas"}
                  {resumoDemandas.total > 0 && (
                    <span className="text-ink-3"> · {resumoDemandas.concluidas} concluídas</span>
                  )}
                </Fact>
                <Fact label="Materiais entregues">
                  {deliverables.length} {deliverables.length === 1 ? "arquivo" : "arquivos"}
                </Fact>
              </div>
            </Panel>
          </div>
        </Section>

        {/* ================= 1.5 LEITURA AUTOMÁTICA =================
            Entra logo depois do resumo e ANTES dos números, de propósito:
            quem abre o relatório quer saber "como foi" antes de "quanto
            deu". A seção não inventa nada — quando não há base de
            comparação, ela diz exatamente isso. */}
        {comparacaoIndisponivel && (
          <Alert tone="warning" title="Leitura automática indisponível agora">
            Não foi possível carregar os números consolidados para comparar este evento com os
            demais. O restante do relatório está completo — só esta seção ficou de fora. Atualize a
            página; se continuar, avise a equipe de Comunicação.
          </Alert>
        )}

        {!comparacaoIndisponivel && temLeitura && (
          <Section
            id="leitura"
            as="div"
            eyebrow="Leitura automática"
            title="O que os dados dizem"
            description="Gerado a partir dos próprios registros do portal, comparando este evento com os do mesmo tipo e com o histórico do ministério."
            className="scroll-mt-28"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <Panel
                title="Destaques"
                className="lg:col-span-3"
                action={<InsightResumo insights={leitura.insights} />}
              >
                <InsightList
                  insights={leitura.insights}
                  amostraComparavel={leitura.amostraComparavel}
                  dadosInsuficientes={leitura.dadosInsuficientes}
                />
              </Panel>

              <Panel
                title="Contra eventos semelhantes"
                description="Onde este evento cai na faixa usual"
                className="lg:col-span-2"
              >
                <ComparacaoPanel linhas={comparacoes} />
              </Panel>
            </div>
          </Section>
        )}

        {/* ================= 2. RESULTADO ================= */}
        {(hasMeta || investimento != null || orcamentoAprovado != null) && (
          <Section
            id="resultado"
            as="div"
            eyebrow="Prestação de contas"
            title="Quanto foi investido e o que voltou"
            description={
              hasMeta
                ? "Números consolidados de toda a mídia paga vinculada a este evento."
                : "Valores lançados no planejamento financeiro da campanha."
            }
            className="scroll-mt-28"
          >
            <MetricRow columns={4} className="mb-4">
              <Metric
                size="hero"
                label={METRICS.investimento.label}
                value={formatMoney(investimento, true)}
                hint={
                  usoOrcamento != null
                    ? `${usoOrcamento.toFixed(0)}% do orçamento aprovado`
                    : "sem orçamento aprovado para comparar"
                }
                icon={<Icon.Wallet className="h-4 w-4" />}
                footer={usoOrcamento != null ? <Progress value={Math.min(usoOrcamento, 100)} tone={usoOrcamento > 100 ? "danger" : "accent"} showValue={false} /> : undefined}
              />

              {hasMeta ? (
                <>
                  <Metric
                    size="hero"
                    label={METRICS.alcance.label}
                    value={formatCompact(metaMetrics.alcance)}
                    hint={`${formatCompact(metaMetrics.impressoes)} exibições no total`}
                    icon={<Icon.Users className="h-4 w-4" />}
                  />
                  <Metric
                    size="hero"
                    label={METRICS.vendas.label}
                    value={metaMetrics.vendasDisponivel ? formatCompact(metaMetrics.vendas) : "—"}
                    hint={
                      metaMetrics.vendasDisponivel
                        ? "conversões rastreadas pelo site"
                        : "sem rastreamento de conversão configurado"
                    }
                    icon={<Icon.CheckCircle className="h-4 w-4" />}
                  />
                  <Metric
                    size="hero"
                    label={METRICS.cpa.label}
                    value={formatMoney(metaMetrics.cpa)}
                    hint={METRICS.cpa.description}
                    icon={<Icon.Target className="h-4 w-4" />}
                  />
                </>
              ) : (
                <>
                  <Metric
                    size="hero"
                    label={METRICS.orcamento_planejado.label}
                    value={formatMoney(orcamentoPlanejado, true)}
                    hint="previsto no planejamento"
                    icon={<Icon.Layers className="h-4 w-4" />}
                  />
                  <Metric
                    size="hero"
                    label={METRICS.orcamento_aprovado.label}
                    value={formatMoney(orcamentoAprovado, true)}
                    hint="liberado para a campanha"
                    icon={<Icon.CheckCircle className="h-4 w-4" />}
                  />
                  <Metric
                    size="hero"
                    label={METRICS.demandas.label}
                    value={resumoDemandas.total}
                    hint={`${resumoDemandas.concluidas} concluídas`}
                    icon={<Icon.ListChecks className="h-4 w-4" />}
                  />
                </>
              )}
            </MetricRow>

            {/* Três valores de orçamento lado a lado, com a diferença
                explícita — o cliente não deveria precisar subtrair de
                cabeça pra saber se sobrou ou estourou. */}
            {(orcamentoPlanejado != null || orcamentoAprovado != null) && (
              <Panel title="Orçamento">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Fact label={METRICS.orcamento_planejado.label}>{formatMoney(orcamentoPlanejado, true)}</Fact>
                  <Fact label={METRICS.orcamento_aprovado.label}>{formatMoney(orcamentoAprovado, true)}</Fact>
                  <Fact label="Realizado">{formatMoney(investimento, true)}</Fact>
                  <Fact label="Saldo">
                    {orcamentoAprovado != null && investimento != null ? (
                      <span
                        className={cn(
                          "font-medium",
                          orcamentoAprovado - investimento < 0 ? "text-danger" : "text-success"
                        )}
                      >
                        {formatMoney(orcamentoAprovado - investimento, true)}
                        <span className="ml-1 text-caption font-normal text-ink-3">
                          {orcamentoAprovado - investimento < 0 ? "acima do aprovado" : "não utilizado"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </Fact>
                </div>
              </Panel>
            )}

            {resultadosObservacoes && (
              <Alert tone="accent" title="Leitura da Comunicação" className="mt-4">
                <p className="whitespace-pre-line leading-relaxed">{resultadosObservacoes}</p>
              </Alert>
            )}
          </Section>
        )}

        {/* ================= 3. MÍDIA ================= */}
        {hasMeta && (
          <Section
            id="midia"
            as="div"
            eyebrow="Mídia paga"
            title="Como a verba se comportou"
            description="Evolução ao longo das semanas, perfil de quem foi alcançado e desempenho por criativo."
            className="scroll-mt-28"
          >
            <div className="space-y-4">
              <WeekPerformance total={metaMetrics} weekly={metaWeekly} />

              <Panel title="Evolução semanal" description="Investimento e resultados por semana">
                <MetaWeeklyChart data={metaWeekly} />
              </Panel>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="Público alcançado" description="Distribuição do investimento por gênero">
                  <MetaGenderChart data={metaDemographics.genero} />
                </Panel>
                <Panel title="Faixa etária" description="Onde o investimento se concentrou">
                  <MetaAgeChart data={metaDemographics.idade} />
                </Panel>
              </div>

              <Panel title="Desempenho por criativo" description="Ordenado pelo investimento recebido">
                <MetaAdsRanking ads={metaAds} />
              </Panel>
            </div>
          </Section>
        )}

        {/* ================= 4. ENTREGAS ================= */}
        {deliverables.length > 0 && (
          <Section
            id="entregas"
            as="div"
            eyebrow="Material"
            title={`O que foi entregue (${deliverables.length})`}
            description="Peças, artes e links finais produzidos para este evento."
            className="scroll-mt-28"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {deliverables.map((d) => (
                <DeliverableCard key={d.id} deliverable={d} canApprove={canApprove} />
              ))}
            </div>
          </Section>
        )}

        {/* ================= 5. REGISTRO ================= */}
        <Section
          id="registro"
          as="div"
          eyebrow="Registro"
          title="O caminho até aqui"
          description="Marcos do planejamento e todas as demandas ligadas a este evento."
          className="scroll-mt-28"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Marcos" description={progress !== null ? `${progress}% concluído` : undefined}>
              {milestones.length > 0 ? (
                <>
                  {progress !== null && (
                    <Progress
                      value={progress}
                      tone={progress === 100 ? "success" : "accent"}
                      showValue={false}
                      className="mb-4"
                    />
                  )}
                  <MilestoneTimeline milestones={milestones} />
                </>
              ) : (
                <EmptyState
                  size="sm"
                  icon={<Icon.Flag className="h-4 w-4" />}
                  title="Sem marcos definidos"
                  description="O progresso da campanha é calculado a partir dos marcos cadastrados."
                />
              )}
            </Panel>

            <Panel
              title={`Demandas (${demandasOrdenadas.length})`}
              description="Cada peça produzida para este evento"
              className="lg:col-span-2"
              noPadding
            >
              {demandasOrdenadas.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    size="sm"
                    icon={<Icon.ListChecks className="h-4 w-4" />}
                    title="Nenhuma demanda vinculada"
                    description="As demandas aparecem aqui quando recebem a tag desta campanha no Asana."
                  />
                </div>
              ) : (
                <>
                  <div className="border-b border-line p-4 sm:p-5">
                    <StageBar stages={stages} total={demandasOrdenadas.length} height="h-7" />
                  </div>
                  <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                    {demandasOrdenadas.map((d) => (
                      <li key={d.id}>
                        <Link
                          href={`/dashboard/demandas/${d.id}`}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-120 hover:bg-surface-sunken sm:px-5"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-small text-ink">{d.titulo}</span>
                            {d.prazo_acordado && (
                              <span className={cn("block text-caption", d.overdue ? "text-danger" : "text-ink-3")}>
                                {d.overdue ? "venceu em " : "prazo "}
                                {formatDate(d.prazo_acordado)}
                              </span>
                            )}
                          </span>
                          <Badge tone={statusTone(d.status)} size="sm" dot>
                            {STATUS_LABEL[d.status] ?? d.status}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>

          {hasMeta && (
            <Panel title="Todos os criativos" description="Dado bruto, exportável em CSV" className="mt-4">
              <MetaAdsTable ads={metaAds} />
            </Panel>
          )}
        </Section>
      </div>
    </div>
  );
}
