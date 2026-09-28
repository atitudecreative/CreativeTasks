import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import {
  getDemandsForMinistry,
  summarizeDemands,
  isOverdue,
  STATUS_LABEL,
} from "@/lib/data/demands";
import { getCampaignsForMinistry, SAUDE_LABEL } from "@/lib/data/campaigns";
import { getDeliverablesForMinistry } from "@/lib/data/deliverables";
import { countByStage, stageOf } from "@/lib/demandStages";
import { TIMEZONE, hoje, formatarDiaMes, formatarDataCompleta } from "@/lib/dates";
import { getUniversoComparacao } from "@/lib/data/campanhaPerfil";
import { lerMinisterio } from "@/lib/carteira";
import { LeituraMinisterioPanel } from "@/components/intel/LeituraMinisterio";
import { statusTone, saudeTone, deliverableTone } from "@/lib/statusColors";
import { DELIVERABLE_STATUS_LABEL } from "@/lib/deliverableOptions";
import {
  Alert, Badge, Board, BoardRow, Button, Icon, Metric, PageBody,
  Panel, RailBlock, Section, EmptyState,
} from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { StageBar } from "@/components/charts/StageBar";
import { StageColumns } from "@/components/charts/StageColumns";
import { agruparPorMesEEstagio } from "@/lib/demandSeries";
import { METRICS, formatCompact, formatMoney as formatMoneyCompact } from "@/lib/metricLanguage";
import {
  PERIODOS, contarNoPeriodo, lerPeriodo, manchete, resultadoDoPeriodo,
} from "@/lib/resultados";
import { AttentionList } from "./AttentionList";
import { PeriodoResultados } from "./PeriodoResultados";
import { CampanhasDoPeriodo } from "./CampanhasDoPeriodo";
import { OrcamentoPorCampanha, type LinhaOrcamento } from "./OrcamentoPorCampanha";

export const metadata = { title: "Início" };

// Saudação pelo horário de Brasília, não pelo fuso do servidor (que no
// Render roda em UTC).
function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", hour12: false }).format(new Date())
  );
  if (hour >= 6 && hour < 12) return "Bom dia";
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

/* =========================================================================
   INÍCIO
   -------------------------------------------------------------------------
   A pergunta que o cliente traz ao abrir o portal é "qual foi o resultado
   do trabalho?". A versão anterior abria com o estado das DEMANDAS (fila,
   produção, atrasos) e deixava resultado de mídia para o rodapé, sem
   recorte de tempo e sem comparação. A ordem agora é a da pergunta:

     1. RESULTADO      o que o marketing trouxe no período escolhido, contra
                       o período anterior — e quais campanhas fizeram isso
     2. ANDAMENTO      em que pé está o trabalho da Comunicação hoje
     3. MATERIAL       o que foi entregue por último
     4. HISTÓRICO      a evolução dos eventos, desde sempre

   O que precisa de ação (atrasos, "com você", campanhas em risco) fica no
   trilho, à vista desde a primeira dobra.

   Duas remoções deliberadas:
   - "Estimativa de horas trabalhadas" (saiu numa passagem anterior): era
     derivada de um hash do id da demanda — número inventado.
   - O gráfico "Planejado / Aprovado / Investido": cada barra somava um
     conjunto diferente de campanhas (ver OrcamentoPorCampanha).
   ========================================================================= */

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { ministry } = await requireMinistry();
  const periodo = lerPeriodo(searchParams?.periodo);

  const [demands, campaigns, deliverables, universoCarga] = await Promise.all([
    getDemandsForMinistry(ministry.id),
    getCampaignsForMinistry(ministry.id),
    getDeliverablesForMinistry(ministry.id),
    // Universo de comparação: o RLS já recorta pro que este usuário pode
    // ver, então um ministério compara contra o próprio histórico.
    getUniversoComparacao(),
  ]);

  // A base de comparação pode não vir — é uma view (migration 0032) e um
  // banco que ainda não a recebeu não deve derrubar o Início inteiro. O
  // que ela NÃO pode fazer é falhar em silêncio: o painel diria "dados
  // insuficientes", que significa outra coisa.
  const universo = universoCarga.ok ? universoCarga.dados : [];
  const comparacaoIndisponivel = !universoCarga.ok;

  const leitura = lerMinisterio(ministry.id, universo);

  const hojeBr = hoje();
  const mesAtual = hojeBr.slice(0, 7);

  /* ---------------------------- RESULTADO ---------------------------- */

  // O recorte de campanhas é o MESMO da aba Campanhas (as que este
  // ministério enxerga), e os números vêm do perfil consolidado — a mesma
  // fonte do relatório de cada campanha, para o Início nunca divergir da
  // tela seguinte.
  const idsVisiveis = new Set(campaigns.map((c) => c.id));
  const perfis = universo.filter((c) => idsVisiveis.has(c.id));
  const resultado = resultadoDoPeriodo(perfis, periodo, hojeBr);
  const defPeriodo = PERIODOS.find((p) => p.chave === periodo)!;
  const rotuloAnterior = `aos ${defPeriodo.rotulo} anteriores`;
  const deltaLabel = resultado.anterior ? `vs. ${defPeriodo.rotulo} anteriores` : undefined;
  const semBaseAnterior = resultado.anterior != null && resultado.anterior.eventos === 0;
  const frase = manchete(resultado, rotuloAnterior);

  const concluidasNoPeriodo = contarNoPeriodo(demands.map((d) => d.data_conclusao), resultado.janela);
  const entreguesNoPeriodo = contarNoPeriodo(deliverables.map((e) => e.data_entrega), resultado.janela);

  const { atual } = resultado;
  const comInvestimento = resultado.campanhas.filter((c) => c.investimento != null).length;

  const descricaoJanela = resultado.janela.inicio
    ? `Campanhas e eventos com data a partir de ${formatarDataCompleta(resultado.janela.inicio)}, incluindo os que ainda estão em andamento.`
    : "Todas as campanhas e eventos publicados para este ministério, desde o primeiro.";

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

  // Orçamento × realizado sobre as campanhas do período — só as que têm
  // as duas pontas. O realizado é o do perfil (mídia sincronizada, senão
  // o lançado à mão), a mesma regra do relatório.
  const perfilPorId = new Map(resultado.campanhas.map((c) => [c.id, c]));
  const campanhasPorId = new Map(campaigns.map((c) => [c.id, c]));
  const linhasOrcamento: LinhaOrcamento[] = [];
  let semOrcamento = 0;
  for (const perfil of resultado.campanhas) {
    const c = campanhasPorId.get(perfil.id);
    const realizado = perfilPorId.get(perfil.id)?.investimento ?? c?.investimento_realizado ?? null;
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

  /* ---------------------------- ANDAMENTO ---------------------------- */

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

  // Ordenado por prazo, do mais próximo pro mais distante.
  const proximosPrazos = demands
    .filter(
      (d) =>
        d.prazo_acordado &&
        !isOverdue(d, hojeBr) &&
        d.status !== "concluida" &&
        d.status !== "cancelada"
    )
    .sort((a, b) => (a.prazo_acordado ?? "").localeCompare(b.prazo_acordado ?? ""))
    .slice(0, 5);

  const arquivosRecentes = deliverables.slice(0, 4);

  const temAtencao = atrasadas.length > 0 || aguardando.length > 0 || campanhasRisco.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow={getTodayLabel()}
        title={
          <>
            {getGreeting()}, <span className="text-brand-600">{ministry.name}</span>
          </>
        }
        actions={
          <>
            <Link href="/dashboard/demandas">
              <Button variant="secondary" iconLeft={<Icon.ListChecks className="h-4 w-4" />}>
                Demandas
              </Button>
            </Link>
            <Link href="/dashboard/campanhas">
              <Button variant="primary" iconRight={<Icon.ArrowRight className="h-4 w-4" />}>
                Ver campanhas
              </Button>
            </Link>
          </>
        }
      />

      <PageBody
        rail={
          <>
            <RailBlock label="Precisa de atenção" className="scroll-mt-20" id="atencao">
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
            </RailBlock>

            <RailBlock
              label="Próximos prazos"
              action={
                <Link
                  href="/dashboard/demandas"
                  className="inline-flex min-h-6 items-center text-caption text-brand-600 underline-offset-4 hover:underline"
                >
                  ver todas
                </Link>
              }
            >
              <Board>
                {proximosPrazos.length === 0 ? (
                  <p className="px-4 py-6 text-center text-caption text-ink-3">
                    Nenhum prazo em aberto no momento.
                  </p>
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
            </RailBlock>
          </>
        }
      >
        {/* Abaixo de xl o trilho desce para o fim da página. O que pede ação
            não pode ir junto: uma linha curta no topo leva direto a ele. */}
        {(aguardando.length > 0 || atrasadas.length > 0) && (
          <Link
            href="#atencao"
            className="mb-5 flex items-center gap-2 rounded-card border border-warning-line bg-warning-soft px-3.5 py-2.5 text-small text-ink xl:hidden"
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
            <Icon.ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
          </Link>
        )}

        {/* =================================================================
            1. RESULTADO
            ================================================================= */}
        <section aria-labelledby="resultado-titulo" className="mb-section">
          <PeriodoResultados
            periodo={periodo}
            header={
              <>
                <p className="mb-1.5 font-mono text-label uppercase text-ink-3">Resultado do marketing</p>
                <h2 id="resultado-titulo" className="text-h2 text-ink">
                  O que o trabalho trouxe
                </h2>
                <p className="mt-1 max-w-prose text-small text-ink-2">{descricaoJanela}</p>
              </>
            }
          >
            {comparacaoIndisponivel ? (
              <Alert tone="warning" title="Os números das campanhas não carregaram agora">
                O restante da página está atualizado. Recarregue em alguns instantes; se continuar, avise a
                Comunicação.
              </Alert>
            ) : atual.eventos === 0 ? (
              <EmptyState
                icon={<Icon.Megaphone className="h-5 w-5" />}
                title={periodo === "tudo" ? "Nenhuma campanha publicada ainda" : "Nenhuma campanha neste período"}
                description={
                  periodo === "tudo"
                    ? "Quando a Comunicação publicar a primeira campanha ou evento, o investimento e o retorno aparecem aqui."
                    : "Não há campanha ou evento com data neste recorte. Escolha um período maior acima para ver o histórico."
                }
              />
            ) : (
              <>
                {frase && (
                  <p className="mb-4 flex items-start gap-2 text-body text-ink">
                    <Icon.Sparkles className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    <span>{frase}</span>
                  </p>
                )}

                {/* 2×2 até sobrar largura para quatro. A faixa padrão (3 no
                    tablet, 4 a partir de lg) deixava um cartão órfão no tablet
                    e, com o trilho ao lado, espremia "R$ 59,07" contra a borda
                    entre 1024 e 1400px. */}
                <div className="signal-stagger grid grid-cols-2 gap-3 min-[1400px]:grid-cols-4">
                  <Metric
                    size="hero"
                    label={METRICS.investimento.label}
                    help={METRICS.investimento.description}
                    value={atual.investimento != null ? formatMoneyCompact(atual.investimento, true) : "—"}
                    delta={resultado.variacao.investimento}
                    deltaNeutral
                    deltaLabel={resultado.variacao.investimento != null ? deltaLabel : undefined}
                    hint={
                      atual.investimento == null
                        ? "nenhum valor lançado"
                        : `em ${comInvestimento} de ${atual.eventos} ${atual.eventos === 1 ? "campanha" : "campanhas"}`
                    }
                  />
                  <Metric
                    size="hero"
                    label={METRICS.alcance.label}
                    help={`${METRICS.alcance.description} Aqui é a soma do alcance de cada campanha: quem viu duas campanhas conta duas vezes.`}
                    value={formatCompact(atual.alcance)}
                    delta={resultado.variacao.alcance}
                    deltaLabel={resultado.variacao.alcance != null ? deltaLabel : undefined}
                    hint={atual.alcance == null ? "sem mídia paga vinculada" : `em ${atual.comMidia} com mídia paga`}
                  />
                  <Metric
                    size="hero"
                    label={METRICS.vendas.label}
                    help={METRICS.vendas.description}
                    value={atual.resultados != null ? Math.round(atual.resultados).toLocaleString("pt-BR") : "—"}
                    delta={resultado.variacao.resultados}
                    deltaLabel={resultado.variacao.resultados != null ? deltaLabel : undefined}
                    hint={atual.resultados == null ? "sem conversão rastreada" : "conversões registradas"}
                  />
                  <Metric
                    size="hero"
                    label={METRICS.cpa.label}
                    help={METRICS.cpa.description}
                    value={
                      atual.custoPorResultado != null
                        ? atual.custoPorResultado.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            minimumFractionDigits: 2,
                          })
                        : "—"
                    }
                    delta={resultado.variacao.custoPorResultado}
                    deltaInvert
                    deltaLabel={resultado.variacao.custoPorResultado != null ? deltaLabel : undefined}
                    hint={atual.custoPorResultado == null ? "exige investimento e resultado rastreado" : "quanto custou cada resultado"}
                  />
                </div>

                {semBaseAnterior && (
                  <p className="mt-2 text-caption text-ink-3">
                    Não houve campanha nos {defPeriodo.rotulo} anteriores, por isso não há comparação.
                  </p>
                )}

                {/* O trabalho que está por trás dos números — numa frase, sem
                    mais três caixas. */}
                <p className="mt-4 rounded-card border border-line bg-surface-sunken px-4 py-3 text-small text-ink-2">
                  No mesmo período, a Comunicação{" "}
                  <Link href="/dashboard/demandas" className="-my-1 inline-block py-1 font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink">
                    concluiu {concluidasNoPeriodo.atual} {concluidasNoPeriodo.atual === 1 ? "demanda" : "demandas"}
                  </Link>{" "}
                  e{" "}
                  <Link href="/dashboard/entregas" className="-my-1 inline-block py-1 font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink">
                    entregou {entreguesNoPeriodo.atual} {entreguesNoPeriodo.atual === 1 ? "arquivo" : "arquivos"}
                  </Link>
                  , em {atual.eventos} {atual.eventos === 1 ? "campanha ou evento" : "campanhas e eventos"}.
                </p>

                <div className="mt-4 space-y-4">
                  <Panel noPadding>
                    <CampanhasDoPeriodo campanhas={campanhasDoPeriodo} />
                  </Panel>
                  <Panel title="Orçamento × realizado" description="Quanto de cada orçamento já foi usado">
                    <OrcamentoPorCampanha linhas={linhasOrcamento} semOrcamento={semOrcamento} />
                  </Panel>
                </div>
              </>
            )}
          </PeriodoResultados>
        </section>

        {/* =================================================================
            2. ANDAMENTO
            ================================================================= */}
        <Section
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
          className="mb-section"
        >
          {resumo.total === 0 ? (
            <EmptyState
              icon={<Icon.ListChecks className="h-5 w-5" />}
              title="Nenhuma demanda ainda"
              description="Assim que a Comunicação publicar as primeiras demandas deste ministério, elas aparecem aqui."
            />
          ) : (
            <>
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

              {composicao.length > 1 && (
                <Panel
                  title="Onde está o trabalho"
                  description="Demandas por mês de prazo, divididas por estágio"
                  className="mt-5"
                >
                  <StageColumns colunas={composicao} className="pt-4" altura={148} />
                </Panel>
              )}
            </>
          )}
        </Section>

        {/* =================================================================
            3. MATERIAL
            ================================================================= */}
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
          className="mb-section"
        >
          <Board>
            {arquivosRecentes.length === 0 ? (
              <p className="px-4 py-6 text-center text-caption text-ink-3">
                Nenhum arquivo registrado ainda.
              </p>
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

        {/* =================================================================
            4. HISTÓRICO
            ================================================================= */}
        <Section
          eyebrow="Histórico"
          title="Como os eventos vêm evoluindo"
          description="Todos os eventos publicados deste ministério, e a eficiência contra os demais."
        >
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
      </PageBody>
    </div>
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
