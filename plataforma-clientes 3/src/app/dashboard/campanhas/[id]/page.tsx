import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCampaignById,
  getMilestonesForCampaign,
  getDemandsForCampaign,
  calculateProgress,
  TIPO_LABEL,
  FASE_LABEL,
  SAUDE_LABEL,
} from "@/lib/data/campaigns";
import { SAUDE_COLOR_HEX } from "@/lib/campaignOptions";
import { STATUS_LABEL, summarizeDemands, getStatusBreakdown, isOverdue } from "@/lib/data/demands";
import { getDeliverablesForCampaign } from "@/lib/data/deliverables";
import {
  getMetaCampaignsForCampaign,
  summarizeMetaMetrics,
  getMetaAdsForCampaign,
  getMetaWeeklyStatsForCampaign,
  getMetaDemographicsForCampaign,
} from "@/lib/data/metaAds";
import { getCurrentUser, isComunicacaoGlobal } from "@/lib/data/ministries";
import { DeliverableCard } from "@/components/DeliverableCard";
import { MetricCard } from "@/components/MetricCard";
import { MilestoneTimeline } from "./MilestoneTimeline";
import { StatusPieChart } from "../../DashboardCharts";
import { CampaignMetaReport } from "./CampaignMetaReport";
import {
  IconArrowLeft,
  IconTarget,
  IconLayers,
  IconCalendar,
  IconWallet,
  IconFlag,
  IconListChecks,
  IconPaperclip,
  IconMessage,
  IconCheckCircle,
  IconAlertTriangle,
  IconTrendingUp,
} from "./icons";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "não definido";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SectionHeader({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-600">{icon}</span>
        <p className="text-sm font-semibold text-neutral-800">{title}</p>
      </div>
      {right}
    </div>
  );
}

export default async function CampanhaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [milestones, demands, deliverables, metaCampaigns, metaAds, metaWeekly, metaDemographics, currentUser] =
    await Promise.all([
      getMilestonesForCampaign(id),
      getDemandsForCampaign(id),
      getDeliverablesForCampaign(id),
      getMetaCampaignsForCampaign(id),
      getMetaAdsForCampaign(id),
      getMetaWeeklyStatsForCampaign(id),
      getMetaDemographicsForCampaign(id),
      getCurrentUser(),
    ]);
  const metaMetrics = summarizeMetaMetrics(metaCampaigns);
  const progress = calculateProgress(milestones);
  const proximoMarco = milestones.find((m) => !m.concluido);
  // Só aprovação de entregas fica aqui — edição da campanha em si (info +
  // capa) agora é só via admin, em /dashboard/admin/campanhas-pendentes.
  // Esta tela é o dashboard público do evento: números + dados + demandas
  // relacionadas, sem controles de edição.
  const canApprove = isComunicacaoGlobal(currentUser);

  const resumoDemandas = summarizeDemands(demands);
  const statusBreakdown = getStatusBreakdown(demands);
  const demandasOrdenadas = [...demands].sort((a, b) => {
    if (!a.prazo_acordado) return 1;
    if (!b.prazo_acordado) return -1;
    return a.prazo_acordado.localeCompare(b.prazo_acordado);
  });

  const saudeColor = SAUDE_COLOR_HEX[campaign.saude] ?? "#a8a29e";
  const temSobreEvento = Boolean(
    campaign.objetivo_estrategico ||
      campaign.escopo_macro ||
      campaign.data_inicio ||
      campaign.data_termino ||
      campaign.orcamento_planejado ||
      campaign.orcamento_aprovado
  );

  return (
    <div>
      <Link
        href="/dashboard/campanhas"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition hover:text-brand-600"
      >
        <IconArrowLeft className="h-3.5 w-3.5" />
        Campanhas e eventos
      </Link>

      {/* Hero — banner em 16:9 (fullHD), com a imagem de capa ou um
          gradiente da identidade visual quando não há capa cadastrada. */}
      <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-3xl shadow-sm">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={
            campaign.capa_url
              ? { backgroundImage: `url(${campaign.capa_url})` }
              : { background: "linear-gradient(135deg, rgb(var(--walnut-900)), rgb(var(--brand-700)))" }
          }
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.78) 100%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {campaign.identificador && (
              <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {campaign.identificador}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: saudeColor }} />
              {SAUDE_LABEL[campaign.saude] ?? campaign.saude}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm ${
                campaign.publicada ? "border-green-300/40 bg-green-400/20 text-green-50" : "border-white/25 bg-white/10 text-white"
              }`}
            >
              {campaign.publicada ? "Ativa" : "Oculta"}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight text-white sm:text-4xl">{campaign.nome}</h1>
          <p className="mt-1.5 text-sm text-white/70">
            {TIPO_LABEL[campaign.tipo] ?? campaign.tipo} · {FASE_LABEL[campaign.fase] ?? campaign.fase}
          </p>
        </div>
      </div>

      {/* Visão geral rápida da campanha (demandas) */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Demandas" value={resumoDemandas.total} accent="brand" icon={<IconListChecks className="h-4 w-4" />} />
        <MetricCard label="Concluídas" value={resumoDemandas.concluidas} accent="green" icon={<IconCheckCircle className="h-4 w-4" />} />
        <MetricCard label="Atrasadas" value={resumoDemandas.atrasadas} accent="red" icon={<IconAlertTriangle className="h-4 w-4" />} />
        <MetricCard label="Em andamento" value={resumoDemandas.abertas} accent="violet" icon={<IconTrendingUp className="h-4 w-4" />} />
      </div>

      {metaCampaigns.length > 0 && (
        <CampaignMetaReport
          campaignNome={campaign.nome}
          publicada={campaign.publicada}
          metaCampaigns={metaCampaigns}
          metaMetrics={metaMetrics}
          metaWeekly={metaWeekly}
          metaDemographics={metaDemographics}
          metaAds={metaAds}
        />
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(progress !== null || milestones.length > 0) && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <SectionHeader
                icon={<IconFlag className="h-4 w-4" />}
                title="Marcos e progresso"
                right={
                  progress !== null ? (
                    <span className="text-sm font-semibold text-neutral-900">{progress}%</span>
                  ) : undefined
                }
              />
              {progress !== null && (
                <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress}%` }} />
                </div>
              )}
              {proximoMarco && (
                <p className="mb-4 mt-2 text-xs text-neutral-500">Próximo marco: {proximoMarco.nome}</p>
              )}
              {milestones.length > 0 && (
                <div className={progress !== null ? "mt-5 border-t border-neutral-100 pt-5" : ""}>
                  <MilestoneTimeline milestones={milestones} />
                </div>
              )}
              {progress === null && milestones.length === 0 && (
                <p className="text-sm text-neutral-400">Sem marcos definidos pra essa campanha ainda.</p>
              )}
            </div>
          )}

          {temSobreEvento && (
            <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <SectionHeader icon={<IconTarget className="h-4 w-4" />} title="Sobre o evento" />

              {campaign.objetivo_estrategico && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                    <IconTarget className="h-3.5 w-3.5" /> Objetivo estratégico
                  </p>
                  <p className="text-sm text-neutral-800">{campaign.objetivo_estrategico}</p>
                </div>
              )}
              {campaign.escopo_macro && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                    <IconLayers className="h-3.5 w-3.5" /> Escopo macro
                  </p>
                  <p className="text-sm text-neutral-800">{campaign.escopo_macro}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4">
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                    <IconCalendar className="h-3.5 w-3.5" /> Início
                  </p>
                  <p className="text-sm text-neutral-800">{formatDate(campaign.data_inicio)}</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                    <IconCalendar className="h-3.5 w-3.5" /> Término
                  </p>
                  <p className="text-sm text-neutral-800">{formatDate(campaign.data_termino)}</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                    <IconWallet className="h-3.5 w-3.5" /> Orçamento planejado
                  </p>
                  <p className="text-sm text-neutral-800">{formatMoney(campaign.orcamento_planejado)}</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                    <IconWallet className="h-3.5 w-3.5" /> Orçamento aprovado
                  </p>
                  <p className="text-sm text-neutral-800">{formatMoney(campaign.orcamento_aprovado)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<IconListChecks className="h-4 w-4" />}
            title="Demandas vinculadas"
            right={demands.length > 0 ? <span className="text-xs text-neutral-400">{demands.length}</span> : undefined}
          />
          <StatusPieChart data={statusBreakdown} />

          {demandasOrdenadas.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">Nenhuma demanda vinculada a esta campanha ainda.</p>
          ) : (
            <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto border-t border-neutral-100 pt-4">
              {demandasOrdenadas.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/dashboard/demandas/${d.id}`} className="min-w-0 truncate font-medium text-neutral-800 hover:underline">
                    {d.titulo}
                  </Link>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {isOverdue(d) && <span className="mr-1.5 font-medium text-rose-600">atrasada ·</span>}
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {deliverables.length > 0 && (
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<IconPaperclip className="h-4 w-4" />}
            title="Entregas dessa campanha"
            right={<span className="text-xs text-neutral-400">{deliverables.length}</span>}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {deliverables.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} canApprove={canApprove} />
            ))}
          </div>
        </div>
      )}

      {campaign.resultados_observacoes && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={<IconMessage className="h-4 w-4" />} title="Resultados e observações" />
          <p className="text-sm text-neutral-800">{campaign.resultados_observacoes}</p>
        </div>
      )}
    </div>
  );
}
