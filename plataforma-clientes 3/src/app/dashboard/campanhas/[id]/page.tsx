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
import { summarizeDemands, getStatusBreakdown, isOverdue } from "@/lib/data/demands";
import { getDeliverablesForCampaign } from "@/lib/data/deliverables";
import {
  getMetaCampaignsForCampaign,
  summarizeMetaMetrics,
  getMetaAdsForCampaign,
  getMetaWeeklyStatsForCampaign,
  getMetaDemographicsForCampaign,
} from "@/lib/data/metaAds";
import { getCurrentUser, isComunicacaoGlobal } from "@/lib/data/ministries";
import { IconArrowLeft } from "./icons";
import { CampaignDashboardTabs } from "./CampaignDashboardTabs";

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
  const demandasOrdenadas = [...demands]
    .sort((a, b) => {
      if (!a.prazo_acordado) return 1;
      if (!b.prazo_acordado) return -1;
      return a.prazo_acordado.localeCompare(b.prazo_acordado);
    })
    .map((d) => ({
      id: d.id,
      titulo: d.titulo,
      status: d.status,
      prazo_acordado: d.prazo_acordado,
      overdue: isOverdue(d),
    }));

  const saudeColor = SAUDE_COLOR_HEX[campaign.saude] ?? "#a8a29e";

  return (
    <div>
      <Link
        href="/dashboard/campanhas"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition hover:text-brand-600"
      >
        <IconArrowLeft className="h-3.5 w-3.5" />
        Campanhas e eventos
      </Link>

      {/* Cabeçalho compacto — miniatura + identidade da campanha numa
          linha só, em vez de um banner grande ocupando a tela toda. */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div
          className="h-14 w-14 shrink-0 rounded-lg bg-cover bg-center"
          style={
            campaign.capa_url
              ? { backgroundImage: `url(${campaign.capa_url})` }
              : { background: "linear-gradient(135deg, rgb(var(--walnut-900)), rgb(var(--brand-700)))" }
          }
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {campaign.identificador && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                {campaign.identificador}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: saudeColor }} />
              {SAUDE_LABEL[campaign.saude] ?? campaign.saude}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                campaign.publicada ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {campaign.publicada ? "Ativa" : "Oculta"}
            </span>
          </div>
          <h1 className="truncate text-lg font-bold leading-tight text-neutral-900">{campaign.nome}</h1>
          <p className="text-xs text-neutral-400">
            {TIPO_LABEL[campaign.tipo] ?? campaign.tipo} · {FASE_LABEL[campaign.fase] ?? campaign.fase}
          </p>
        </div>
      </div>

      <CampaignDashboardTabs
        campaignNome={campaign.nome}
        objetivoEstrategico={campaign.objetivo_estrategico}
        escopoMacro={campaign.escopo_macro}
        dataInicio={campaign.data_inicio}
        dataTermino={campaign.data_termino}
        orcamentoPlanejado={campaign.orcamento_planejado}
        orcamentoAprovado={campaign.orcamento_aprovado}
        resultadosObservacoes={campaign.resultados_observacoes}
        resumoDemandas={resumoDemandas}
        statusBreakdown={statusBreakdown}
        demandasOrdenadas={demandasOrdenadas}
        progress={progress}
        proximoMarco={proximoMarco}
        milestones={milestones}
        deliverables={deliverables}
        canApprove={canApprove}
        metaCampaigns={metaCampaigns}
        metaMetrics={metaMetrics}
        metaWeekly={metaWeekly}
        metaDemographics={metaDemographics}
        metaAds={metaAds}
      />
    </div>
  );
}
