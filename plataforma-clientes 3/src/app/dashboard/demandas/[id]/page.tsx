import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemandById, STATUS_LABEL } from "@/lib/data/demands";
import { getCampaignsForDemandsInMinistry } from "@/lib/data/campaigns";
import { STATUS_COLOR, DEFAULT_STATUS_COLOR } from "@/lib/statusColors";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "não definido";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function DemandaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demand = await getDemandById(id);

  if (!demand) notFound();

  const campaignsMap = await getCampaignsForDemandsInMinistry(demand.ministry_id);
  const campaigns = campaignsMap.get(demand.id) ?? [];

  return (
    <div className="max-w-2xl">
      <p className="mb-1 text-xs font-medium text-neutral-400">{demand.identificador}</p>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">{demand.titulo}</h1>
      <p className="mb-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            STATUS_COLOR[demand.status] ?? DEFAULT_STATUS_COLOR
          }`}
        >
          {STATUS_LABEL[demand.status] ?? demand.status}
        </span>
      </p>

      {campaigns.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/campanhas/${c.id}`}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              {c.nome}
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        {demand.descricao_objetiva && (
          <div>
            <p className="text-xs font-medium text-neutral-400">Descrição</p>
            <p className="text-sm text-neutral-800">{demand.descricao_objetiva}</p>
          </div>
        )}
        {demand.escopo_acordado && (
          <div>
            <p className="text-xs font-medium text-neutral-400">Escopo acordado</p>
            <p className="text-sm text-neutral-800">{demand.escopo_acordado}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-neutral-400">Tipo de serviço</p>
            <p className="text-sm text-neutral-800">{demand.tipo_servico ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400">Prioridade</p>
            <p className="text-sm capitalize text-neutral-800">{demand.prioridade ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400">Prazo acordado</p>
            <p className="text-sm text-neutral-800">{formatDate(demand.prazo_acordado)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400">Data de conclusão</p>
            <p className="text-sm text-neutral-800">{formatDate(demand.data_conclusao)}</p>
          </div>
        </div>
        {demand.pendencia_atual && (
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-700">Pendência atual</p>
            <p className="text-sm text-amber-900">{demand.pendencia_atual}</p>
          </div>
        )}
        {demand.dependencias && (
          <div>
            <p className="text-xs font-medium text-neutral-400">Dependências</p>
            <p className="text-sm text-neutral-800">{demand.dependencias}</p>
          </div>
        )}
        {demand.observacao_publicada && (
          <div>
            <p className="text-xs font-medium text-neutral-400">Observação</p>
            <p className="text-sm text-neutral-800">{demand.observacao_publicada}</p>
          </div>
        )}
        {demand.link_origem && (
          <div>
            <p className="text-xs font-medium text-neutral-400">Link de origem</p>
            <a href={demand.link_origem} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
              {demand.link_origem}
            </a>
          </div>
        )}
        <p className="text-xs text-neutral-400">
          Última atualização: {new Date(demand.updated_at).toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  );
}
