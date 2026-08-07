import { notFound } from "next/navigation";
import {
  getCampaignById,
  getMilestonesForCampaign,
  calculateProgress,
  FASE_LABEL,
  SAUDE_LABEL,
} from "@/lib/data/campaigns";

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

  const milestones = await getMilestonesForCampaign(id);
  const progress = calculateProgress(milestones);
  const proximoMarco = milestones.find((m) => !m.concluido);

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
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium text-neutral-700">Marcos</p>
          <ul className="space-y-2">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span className={m.concluido ? "text-neutral-400 line-through" : "text-neutral-800"}>
                  {m.nome}
                </span>
                <span className="text-xs text-neutral-400">
                  {m.concluido ? "concluído" : formatDate(m.data_prevista)}
                </span>
              </li>
            ))}
          </ul>
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
