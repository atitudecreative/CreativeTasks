import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCampaignById, getMilestonesForCampaign, getDemandsForCampaign, calculateProgress,
} from "@/lib/data/campaigns";
import { summarizeDemands, isOverdue } from "@/lib/data/demands";
import { getDeliverablesForCampaign } from "@/lib/data/deliverables";
import {
  getMetaCampaignsForCampaign, summarizeMetaMetrics, getMetaAdsForCampaign,
  getMetaWeeklyStatsForCampaign, getMetaDemographicsForCampaign,
} from "@/lib/data/metaAds";
import { getCurrentUser, isComunicacaoGlobal } from "@/lib/data/ministries";
import { getPerfilCampanha, getUniversoComparacao } from "@/lib/data/campanhaPerfil";
import { gerarInsights, construirComparacoes } from "@/lib/insights";
import { Breadcrumb } from "@/components/ui";
import { CampaignReport } from "./CampaignReport";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  return { title: campaign?.nome ?? "Campanha" };
}

export default async function CampanhaDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Leitura automática. Roda no servidor porque depende do universo de
  // comparação inteiro — mandar isso pro navegador seria mandar os
  // números de todas as campanhas junto.
  //
  // As duas consultas são independentes do resto e da própria campanha,
  // então vão juntas. Falha em qualquer uma devolve null/vazio e a
  // seção some: comparação é um extra, não pode derrubar o relatório.
  const [perfil, universo] = await Promise.all([
    getPerfilCampanha(id),
    getUniversoComparacao(),
  ]);

  const leitura = perfil
    ? gerarInsights(perfil, universo)
    : { insights: [], amostraComparavel: 0, dadosInsuficientes: false };
  const comparacoes = perfil ? construirComparacoes(perfil, universo) : [];

  const metaMetrics = summarizeMetaMetrics(metaCampaigns);
  const progress = calculateProgress(milestones);
  const proximoMarco = milestones.find((m) => !m.concluido);

  // Só a aprovação de entrega vive nesta tela — editar a campanha em si é
  // no admin. Esta é a visão de prestação de contas, não de operação.
  const canApprove = isComunicacaoGlobal(currentUser);

  const resumoDemandas = summarizeDemands(demands);
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

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Campanhas e eventos", href: "/dashboard/campanhas" },
          { label: campaign.nome },
        ]}
        className="mb-3"
      />

      <CampaignReport
        campaignNome={campaign.nome}
        identificador={campaign.identificador}
        tipo={campaign.tipo}
        fase={campaign.fase}
        saude={campaign.saude}
        publicada={campaign.publicada}
        capaUrl={campaign.capa_url}
        objetivoEstrategico={campaign.objetivo_estrategico}
        escopoMacro={campaign.escopo_macro}
        dataInicio={campaign.data_inicio}
        dataTermino={campaign.data_termino}
        dataEvento={campaign.data_evento}
        orcamentoPlanejado={campaign.orcamento_planejado}
        orcamentoAprovado={campaign.orcamento_aprovado}
        investimentoRealizado={campaign.investimento_realizado}
        resultadosObservacoes={campaign.resultados_observacoes}
        resumoDemandas={resumoDemandas}
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
        leitura={leitura}
        comparacoes={comparacoes}
      />
    </div>
  );
}
