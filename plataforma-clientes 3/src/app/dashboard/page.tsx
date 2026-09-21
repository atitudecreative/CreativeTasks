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
import { countByStage } from "@/lib/demandStages";
import { statusTone, saudeTone, deliverableTone } from "@/lib/statusColors";
import { DELIVERABLE_STATUS_LABEL } from "@/lib/deliverableOptions";
import {
  Badge, Button, Card, Icon, Metric, MetricRow, Panel, Progress, Section, EmptyState, Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { StageBar } from "@/components/charts/StageBar";
import { VolumeChart, BudgetChart } from "@/components/charts/Charts";
import { AttentionList } from "./AttentionList";

export const metadata = { title: "Início" };

const TIMEZONE = "America/Sao_Paulo";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem prazo";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

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

  const [demands, campaigns, deliverables] = await Promise.all([
    getDemandsForMinistry(ministry.id),
    getCampaignsForMinistry(ministry.id),
    getDeliverablesForMinistry(ministry.id),
  ]);

  const resumo = summarizeDemands(demands);
  const stages = countByStage(demands.map((d) => d.status));
  const monthlyStats = getMonthlyDemandStats(demands);
  const budgetSummary = getBudgetSummary(campaigns);

  const taxaConclusao = resumo.total > 0 ? (resumo.concluidas / resumo.total) * 100 : 0;
  const comMinisterio = stages.find((s) => s.key === "ministerio")?.count ?? 0;
  const campanhasRisco = campaigns.filter((c) => c.saude === "atencao" || c.saude === "critica");
  const investimentoTotal = campaigns.reduce((sum, c) => sum + (c.investimento_realizado ?? 0), 0);

  // Variação mês a mês: comparação real entre o último mês fechado e o
  // anterior. Sem histórico suficiente (menos de 2 meses), não mostra
  // delta nenhum — melhor nada do que uma seta sem base.
  const ultimo = monthlyStats[monthlyStats.length - 1];
  const penultimo = monthlyStats[monthlyStats.length - 2];
  const deltaVolume =
    ultimo && penultimo && penultimo.total > 0
      ? ((ultimo.total - penultimo.total) / penultimo.total) * 100
      : null;

  const atrasadas = demands.filter(isOverdue);
  const aguardando = demands.filter((d) =>
    ["aguardando_ministerio", "aguardando_aprovacao", "ajustes_solicitados"].includes(d.status)
  );

  const proximosPrazos = demands
    .filter((d) => d.prazo_acordado && !isOverdue(d) && d.status !== "concluida" && d.status !== "cancelada")
    .slice(0, 5);

  const arquivosRecentes = deliverables.slice(0, 4);

  const temAtencao = atrasadas.length > 0 || aguardando.length > 0 || campanhasRisco.length > 0;

  return (
    <div className="space-y-section">
      <PageHeader
        eyebrow={getTodayLabel()}
        title={
          <>
            {getGreeting()}, <span className="text-brand-600">{ministry.name}</span>
          </>
        }
        description={
          resumo.total === 0
            ? "Ainda não há demandas publicadas para este ministério."
            : `${resumo.abertas} ${resumo.abertas === 1 ? "demanda em andamento" : "demandas em andamento"} e ${campaigns.length} ${campaigns.length === 1 ? "campanha ativa" : "campanhas ativas"}.`
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

      {/* ---------- NÍVEL 1 + 2: estado do trabalho e o que trava ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel
          title="Situação das demandas"
          description={`${resumo.total} ${resumo.total === 1 ? "demanda" : "demandas"} de 2026 em diante`}
          className="lg:col-span-3"
          action={
            <Link href="/dashboard/demandas" className="text-caption text-brand-600 underline-offset-4 hover:underline">
              detalhar
            </Link>
          }
        >
          {resumo.total === 0 ? (
            <EmptyState
              size="sm"
              icon={<Icon.ListChecks className="h-4 w-4" />}
              title="Nada por aqui ainda"
              description="Assim que a Comunicação publicar as primeiras demandas deste ministério, elas aparecem aqui."
            />
          ) : (
            <>
              <StageBar stages={stages} total={resumo.total} />
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
                <Metric size="compact" label="Em andamento" value={resumo.abertas} />
                <Metric size="compact" label="Concluídas" value={resumo.concluidas} />
                <Metric size="compact" label="Com você" value={comMinisterio} />
                <Metric size="compact" label="Atrasadas" value={resumo.atrasadas} />
              </div>
            </>
          )}
        </Panel>

        <Panel
          title="Precisa de atenção"
          className="lg:col-span-2"
          bodyClassName={temAtencao ? "p-0 sm:p-0" : undefined}
          noPadding={temAtencao}
        >
          {temAtencao ? (
            <AttentionList
              atrasadas={atrasadas.slice(0, 4).map((d) => ({
                id: d.id,
                titulo: d.titulo,
                meta: `venceu em ${formatDate(d.prazo_acordado)}`,
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
          ) : (
            <div className="flex h-full min-h-[8rem] flex-col items-center justify-center text-center">
              <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
                <Icon.CheckCircle className="h-5 w-5" />
              </span>
              <p className="text-h4 text-ink">Tudo em dia</p>
              <p className="mt-1 max-w-[16rem] text-caption text-ink-2">
                Nenhuma demanda atrasada, nada esperando por você e nenhuma campanha em risco.
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* ---------- NÍVEL 3: indicadores de apoio ---------- */}
      <Section
        eyebrow="Indicadores"
        title="Números do ministério"
        description="Consolidado de tudo que está publicado para este ministério."
      >
        <MetricRow columns={4}>
          <Metric
            label="Taxa de conclusão"
            value={taxaConclusao.toFixed(0)}
            unit="%"
            hint={`${resumo.concluidas} de ${resumo.total} demandas`}
            icon={<Icon.CheckCircle className="h-4 w-4" />}
            footer={<Progress value={taxaConclusao} tone={taxaConclusao >= 70 ? "success" : "accent"} showValue={false} />}
          />
          <Metric
            label="Demandas no mês"
            value={ultimo?.total ?? 0}
            delta={deltaVolume}
            deltaLabel={penultimo ? `vs. ${penultimo.label}` : undefined}
            hint={!penultimo ? "sem mês anterior para comparar" : undefined}
            icon={<Icon.Activity className="h-4 w-4" />}
          />
          <Metric
            label="Campanhas ativas"
            value={campaigns.length}
            hint={campanhasRisco.length > 0 ? `${campanhasRisco.length} exigindo atenção` : "todas no caminho"}
            icon={<Icon.Megaphone className="h-4 w-4" />}
          />
          <Metric
            label="Investimento realizado"
            value={investimentoTotal > 0 ? formatMoney(investimentoTotal) : "—"}
            hint="somado nas campanhas do ministério"
            icon={<Icon.Wallet className="h-4 w-4" />}
          />
        </MetricRow>
      </Section>

      {/* ---------- NÍVEL 4: tendência ---------- */}
      <Section eyebrow="Tendência" title="Como o trabalho evoluiu">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Volume por mês" description="Demandas abertas e concluídas" className="lg:col-span-2">
            <VolumeChart data={monthlyStats} />
          </Panel>
          <Panel title="Orçamento das campanhas" description="Planejado, aprovado e realizado">
            <BudgetChart data={budgetSummary} />
          </Panel>
        </div>
      </Section>

      {/* ---------- NÍVEL 5: detalhe ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Próximos prazos"
          action={
            <Link href="/dashboard/demandas" className="text-caption text-brand-600 underline-offset-4 hover:underline">
              ver todas
            </Link>
          }
          noPadding
        >
          {proximosPrazos.length === 0 ? (
            <p className="px-5 py-8 text-center text-small text-ink-3">Nenhum prazo em aberto no momento.</p>
          ) : (
            <ul className="divide-y divide-line">
              {proximosPrazos.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/dashboard/demandas/${d.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors duration-120 hover:bg-surface-sunken sm:px-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-medium text-ink">{d.titulo}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-caption text-ink-3">
                        <Icon.Calendar className="h-3 w-3" />
                        {formatDate(d.prazo_acordado)}
                      </span>
                    </span>
                    <Badge tone={statusTone(d.status)} size="sm" dot>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Material recente"
          description="Últimos arquivos entregues"
          action={
            <Link href="/dashboard/entregas" className="text-caption text-brand-600 underline-offset-4 hover:underline">
              ver todos
            </Link>
          }
          noPadding
        >
          {arquivosRecentes.length === 0 ? (
            <p className="px-5 py-8 text-center text-small text-ink-3">Nenhum arquivo registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-line">
              {arquivosRecentes.map((e) => (
                <li key={e.id}>
                  <a
                    href={e.link_principal ?? "/dashboard/entregas"}
                    target={e.link_principal ? "_blank" : undefined}
                    rel={e.link_principal ? "noreferrer" : undefined}
                    className="flex items-center gap-3 px-4 py-3 transition-colors duration-120 hover:bg-surface-sunken sm:px-5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-neutral-soft text-ink-3">
                      <Icon.File className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-medium text-ink">{e.titulo}</span>
                      <span className="block truncate text-caption text-ink-3">
                        {e.tipo_arquivo ?? "arquivo"}
                        {e.versao ? ` · v${e.versao}` : ""}
                        {e.data_entrega ? ` · ${formatDate(e.data_entrega)}` : ""}
                      </span>
                    </span>
                    <Badge tone={deliverableTone(e.status)} size="sm">
                      {DELIVERABLE_STATUS_LABEL[e.status] ?? e.status}
                    </Badge>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
