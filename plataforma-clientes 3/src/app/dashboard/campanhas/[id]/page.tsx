import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCampaignById,
  getMilestonesForCampaign,
  getDemandsForCampaign,
  calculateProgress,
  FASE_LABEL,
  SAUDE_LABEL,
} from "@/lib/data/campaigns";
import { STATUS_LABEL } from "@/lib/data/demands";
import { getDeliverablesForCampaign } from "@/lib/data/deliverables";
import { getCurrentUser, isComunicacaoGlobal } from "@/lib/data/ministries";
import { DeliverableCard } from "@/components/DeliverableCard";
import { MilestoneTimeline } from "./MilestoneTimeline";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "não definido";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CampanhaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [milestones, demands, deliverables, currentUser] = await Promise.all([
    getMilestonesForCampaign(id),
    getDemandsForCampaign(id),
    getDeliverablesForCampaign(id),
    getCurrentUser(),
  ]);
  const progress = calculateProgress(milestones);
  const proximoMarco = milestones.find((m) => !m.concluido);
  const canApprove = isComunicacaoGlobal(currentUser);

  return (
    <div className="max-w-2xl">
      <p className="mb-1 text-xs font-medium text-neutral-400">{campaign.identificador}</p>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">{campaign.nome}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {FASE_LABEL[campaign.fase] ?? campaign.fase} · {SAUDE_LABEL[campaign.saude] ?? campaign.saude}
      </p>

      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">Progresso por marcos</p>
          <p className="text-sm font-semibold text-neutral-900">
            {progress === null ? "sem marcos definidos" : `${progress}%`}
          </p>
        </div>
        {progress !== null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full bg-brand-600" style={{ width: `${progress}%` }} />
          </div>
        )}
        {proximoMarco && (
          <p className="mt-2 text-xs text-neutral-500">Próximo marco: {proximoMarco.nome}</p>
        )}
      </div>

      <div className="mb-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        {campaign.objetivo_estrategico && (
          <div>
            <p className="text-xs font-medium text-neutral-400">Objetivo estratégico</p>
            <p className="text-sm text-neutral-800">{campaign.objetivo_estrategico}</p>
          </div>
        )}
        {campaign.escopo_macro && (
          <div>
            <p className="text-xs font-medium text-neutral-400">Escopo macro</p>
            <p className="text-sm text-neutral-800">{campaign.escopo_macro}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-neutral-400">Início</p>
            <p className="text-sm text-neutral-800">{formatDate(campaign.data_inicio)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400">Término</p>
            <p className="text-sm text-neutral-800">{formatDate(campaign.data_termino)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400">Orçamento planejado</p>
            <p className="text-sm text-neutral-800">{formatMoney(campaign.orcamento_planejado)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400">Orçamento aprovado</p>
            <p className="text-sm text-neutral-800">{formatMoney(campaign.orcamento_aprovado)}</p>
          </div>
        </div>
      </div>

      {milestones.length > 0 && (
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-neutral-700">Linha do tempo</p>
          <MilestoneTimeline milestones={milestones} />
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-neutral-700">
          Demandas vinculadas {demands.length > 0 && `(${demands.length})`}
        </p>
        {demands.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma demanda vinculada a esta campanha ainda.</p>
        ) : (
          <ul className="space-y-2">
            {demands.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <Link
                  href={`/dashboard/demandas/${d.id}`}
                  className="font-medium text-neutral-800 hover:underline"
                >
                  {d.titulo}
                </Link>
                <span className="shrink-0 text-xs text-neutral-400">
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {deliverables.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-neutral-700">
            Entregas dessa campanha ({deliverables.length})
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {deliverables.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} canApprove={canApprove} />
            ))}
          </div>
        </div>
      )}

      {campaign.resultados_observacoes && (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-medium text-neutral-400">Resultados e observações</p>
          <p className="text-sm text-neutral-800">{campaign.resultados_observacoes}</p>
        </div>
      )}
    </div>
  );
}
