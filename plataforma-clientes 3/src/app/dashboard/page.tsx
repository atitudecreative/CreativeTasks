import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import {
  getDemandsForMinistry,
  summarizeDemands,
  getMonthlyDemandStats,
  isOverdue,
  STATUS_LABEL,
} from "@/lib/data/demands";
import { getCampaignsForMinistry, getBudgetSummary, SAUDE_LABEL } from "@/lib/data/campaigns";
import { getDeliverablesForMinistry } from "@/lib/data/deliverables";
import { countByStage, stageOf } from "@/lib/demandStages";
import { TIMEZONE, hoje, formatarDiaMes, formatarMesPorExtenso } from "@/lib/dates";
import { getUniversoComparacao } from "@/lib/data/campanhaPerfil";
import { lerMinisterio } from "@/lib/carteira";
import { LeituraMinisterioPanel } from "@/components/intel/LeituraMinisterio";
import { statusTone, saudeTone, deliverableTone } from "@/lib/statusColors";
import { DELIVERABLE_STATUS_LABEL } from "@/lib/deliverableOptions";
import {
  Badge, Board, BoardGroup, BoardRow, Button, Icon, Metric, MetricRow, PageBody,
  Panel, Progress, RailBlock, Section, EmptyState,
} from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { StageBar } from "@/components/charts/StageBar";
import { BudgetChart } from "@/components/charts/Charts";
import { StageColumns } from "@/components/charts/StageColumns";
import { agruparPorMesEEstagio } from "@/lib/demandSeries";
import { AttentionList } from "./AttentionList";

export const metadata = { title: "Início" };

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

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
   Reorganizado em cinco níveis de leitura, em vez de uma faixa de quatro
   números iguais seguida de gráficos:

     1. RESUMO EXECUTIVO  o estado do trabalho numa barra e uma frase
     2. ATENÇÃO           o que está travado, com link direto pro item
     3. INDICADORES       os números de apoio
     4. TENDÊNCIA         volume no tempo e dinheiro
     5. DETALHE           próximos prazos e material recente

   Uma remoção deliberada: a métrica "Estimativa de horas trabalhadas"
   saiu. Ela era calculada com `estimateDemandMinutes()`, que derivava uma
   duração entre 15min e 2h30 de um HASH DO ID da demanda — um número
   inventado, com aparência de dado apurado, numa plataforma cujo produto
   é prestação de contas. No lugar entrou a taxa de conclusão, que é
   aritmética em cima de dado real.
   ========================================================================= */

export default async function DashboardPage() {
  const { ministry } = await requireMinistry();

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

  // Leitura histórica do ministério — a pergunta "como estamos indo",
  // que o Início não respondia: ele mostrava só o estado de hoje.
  const leitura = lerMinisterio(ministry.id, universo);

  // Uma leitura de "hoje" só, no fuso de Brasília, compartilhada por toda
  // a página — em vez de cada filtro consultar o relógio por conta própria.
  const hojeBr = hoje();
  const mesAtual = hojeBr.slice(0, 7);

  const resumo = summarizeDemands(demands);
  const stages = countByStage(demands.map((d) => d.status));
  const monthlyStats = getMonthlyDemandStats(demands, hojeBr);
  // Mesma leitura da aba Demandas: mês de prazo cruzado com estágio. A
  // versão anterior mostrava total e concluídas (coluna + linha); a
  // composição responde as duas coisas e mais três, no mesmo espaço.
  const composicao = agruparPorMesEEstagio(
    demands.map((d) => ({ prazo: d.prazo_acordado, stage: stageOf(d.status) })),
    mesAtual
  );
  const budgetSummary = getBudgetSummary(campaigns);

  const taxaConclusao = resumo.total > 0 ? (resumo.concluidas / resumo.total) * 100 : null;
  const campanhasRisco = campaigns.filter((c) => c.saude === "atencao" || c.saude === "critica");

  // "Ativas" quer dizer ativas. A contagem anterior era `campaigns.length`,
  // que inclui campanha já concluída — o número só subia, nunca descia, e
  // o cabeçalho da página repetia o mesmo erro.
  const campanhasAtivas = campaigns.filter((c) => c.saude !== "concluida");

  // Investimento pela MESMA regra do relatório de campanha: o gasto de
  // mídia sincronizado quando existe, senão o lançado à mão. Somar só
  // `investimento_realizado` (como era antes) zerava justamente as
  // campanhas que têm Meta Ads ligado — as que mais gastam —, e o Início
  // divergia do relatório que o cliente abre na tela seguinte.
  const perfilPorCampanha = new Map(universo.map((c) => [c.id, c]));
  const campanhasComInvestimento = campaigns.filter(
    (c) => (perfilPorCampanha.get(c.id)?.investimento ?? c.investimento_realizado) != null
  );
  const investimentoTotal = campanhasComInvestimento.reduce(
    (sum, c) => sum + (perfilPorCampanha.get(c.id)?.investimento ?? c.investimento_realizado ?? 0),
    0
  );

  // Volume do mês corrente contra o mês anterior — os dois pela posição
  // no calendário, não pelos dois últimos pontos da série. A versão
  // anterior pegava `monthlyStats[length - 1]`, que é o ÚLTIMO MÊS COM
  // PRAZO: quase sempre um mês no futuro. O card dizia "Demandas no mês"
  // e mostrava, por exemplo, novembro.
  const indiceAtual = monthlyStats.findIndex((m) => m.month === mesAtual);
  const mesCorrente = indiceAtual >= 0 ? monthlyStats[indiceAtual] : null;
  const mesAnterior = indiceAtual > 0 ? monthlyStats[indiceAtual - 1] : null;
  const deltaVolume =
    mesCorrente && mesAnterior && mesAnterior.total > 0
      ? ((mesCorrente.total - mesAnterior.total) / mesAnterior.total) * 100
      : null;

  const atrasadas = demands.filter((d) => isOverdue(d, hojeBr));
  const aguardando = demands.filter((d) =>
    ["aguardando_ministerio", "aguardando_aprovacao", "ajustes_solicitados"].includes(d.status)
  );

  // Ordenado por prazo, do mais próximo pro mais distante. Antes era um
  // .slice(0, 5) em cima da ordem que viesse do banco — o painel se
  // chamava "Próximos prazos" e listava cinco quaisquer.
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
            <Link href="/dashboard/campanhas">
              <Button variant="secondary" iconLeft={<Icon.Megaphone className="h-4 w-4" />}>
                Campanhas
              </Button>
            </Link>
            <Link href="/dashboard/demandas">
              <Button variant="primary" iconRight={<Icon.ArrowRight className="h-4 w-4" />}>
                Ver demandas
              </Button>
            </Link>
          </>
        }
      />

      {/* =====================================================================
          ABERTURA — o estado da operação numa faixa, sem caixa.

          A versão anterior abria com dois painéis lado a lado e depois
          quatro cartões de indicador: seis retângulos antes de qualquer
          leitura. Aqui a primeira coisa é a barra de estágios em tamanho
          grande com os quatro números que importam abaixo dela. Sem borda
          e sem sombra de propósito — é a declaração de abertura da página,
          não mais um bloco competindo com os outros.
          ===================================================================== */}
      {resumo.total === 0 ? (
        <EmptyState
          icon={<Icon.ListChecks className="h-5 w-5" />}
          title="Nada por aqui ainda"
          description="Assim que a Comunicação publicar as primeiras demandas deste ministério, elas aparecem aqui."
        />
      ) : (
        <section className="mb-section border-b border-line pb-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-mono text-label uppercase text-ink-3">Situação das demandas</p>
            <Link
              href="/dashboard/demandas"
              className="inline-flex min-h-6 items-center text-caption text-brand-600 underline-offset-4 hover:underline"
            >
              {resumo.total} {resumo.total === 1 ? "demanda" : "demandas"} de 2026 em diante
            </Link>
          </div>

          <StageBar stages={stages} total={resumo.total} height="h-11" />

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
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
              hint={
                taxaConclusao == null
                  ? undefined
                  : `${taxaConclusao.toFixed(0)}% do total`
              }
            />
          </div>
        </section>
      )}

      <PageBody
        rail={
          <>
            <RailBlock label="Precisa de atenção">
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
        {/* ---------- Onde está o trabalho ---------- */}
        {composicao.length > 1 && (
          <Panel
            title="Onde está o trabalho"
            description="Demandas por mês de prazo, divididas por estágio"
            className="mb-4"
          >
            <StageColumns colunas={composicao} className="pt-4" altura={148} />
          </Panel>
        )}

        {/* ---------- Números de apoio ---------- */}
        <Section
          eyebrow="Indicadores"
          title="Números do ministério"
          description="Consolidado de tudo que está publicado para este ministério."
          className="mb-section"
        >
          <MetricRow columns={3}>
            <Metric
              label={`Prazos em ${formatarMesPorExtenso(mesAtual).split(" de ")[0].toLowerCase()}`}
              value={mesCorrente?.total ?? 0}
              delta={deltaVolume}
              deltaLabel={mesAnterior ? `vs. ${mesAnterior.label}` : undefined}
              hint={
                !mesCorrente
                  ? "nenhuma demanda com prazo neste mês"
                  : !mesAnterior
                    ? "sem mês anterior para comparar"
                    : "demandas com prazo combinado para este mês"
              }
              icon={<Icon.Activity className="h-4 w-4" />}
            />
            <Metric
              label="Campanhas ativas"
              value={campanhasAtivas.length}
              hint={
                campanhasRisco.length > 0
                  ? `${campanhasRisco.length} exigindo atenção`
                  : campanhasAtivas.length === 0
                    ? "nenhuma campanha em andamento"
                    : "todas no caminho"
              }
              icon={<Icon.Megaphone className="h-4 w-4" />}
            />
            <Metric
              label="Investimento realizado"
              value={campanhasComInvestimento.length > 0 ? formatMoney(investimentoTotal) : "—"}
              hint={
                campanhasComInvestimento.length === 0
                  ? "nenhuma campanha com valor lançado"
                  : `em ${campanhasComInvestimento.length} de ${campaigns.length} ${campaigns.length === 1 ? "campanha" : "campanhas"}`
              }
              icon={<Icon.Wallet className="h-4 w-4" />}
            />
          </MetricRow>
        </Section>

        {/* ---------- Material recente ---------- */}
    <RailBlock
          label="Material recente"
          action={
            <Link
              href="/dashboard/entregas"
              className="inline-flex min-h-6 items-center text-caption text-brand-600 underline-offset-4 hover:underline"
            >
              ver todos
            </Link>
          }
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
    </RailBlock>
        {/* ---------- Leitura dos eventos ---------- */}
        <Section
          eyebrow="Leitura"
          title="Como os eventos vêm performando"
          description="Comparação entre os eventos publicados deste ministério e contra os demais."
        >
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <Panel title="Histórico de eventos">
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
            <Panel title="Orçamento das campanhas" description="Planejado, aprovado e realizado">
              <BudgetChart data={budgetSummary} />
            </Panel>
          </div>
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
