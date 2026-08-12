import { requireMinistry } from "@/lib/data/ministries";
import { getDemandsForMinistry, isOverdue, STATUS_LABEL, PRIORIDADE_LABEL } from "@/lib/data/demands";
import { getCampaignsForMinistry, getCampaignsForDemandsInMinistry } from "@/lib/data/campaigns";
import { DemandasExplorer } from "./DemandasExplorer";
import type { DemandRow } from "./DemandTable";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem prazo";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function DemandasPage() {
  const { ministry } = await requireMinistry();

  // Busca tudo de uma vez (só o corte de 2026 em diante já aplicado na
  // query) — busca e filtros de status/campanha/prioridade acontecem no
  // client, instantaneamente, sem precisar recarregar a página.
  const [demands, campaigns, campaignsByDemand] = await Promise.all([
    getDemandsForMinistry(ministry.id),
    getCampaignsForMinistry(ministry.id),
    getCampaignsForDemandsInMinistry(ministry.id),
  ]);

  const rows: DemandRow[] = demands.map((d) => ({
    id: d.id,
    identificador: d.identificador,
    titulo: d.titulo,
    status: d.status,
    statusLabel: STATUS_LABEL[d.status] ?? d.status,
    prioridade: d.prioridade,
    prioridadeLabel: d.prioridade ? PRIORIDADE_LABEL[d.prioridade] ?? d.prioridade : null,
    prazo: d.prazo_acordado,
    prazoFormatted: formatDate(d.prazo_acordado),
    overdue: isOverdue(d),
    campanhas: campaignsByDemand.get(d.id) ?? [],
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Demandas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Solicitações e entregas da Comunicação para {ministry.name}. Use a busca pra achar
        uma demanda específica pelo nome, identificador ou campanha.
      </p>

      <DemandasExplorer demands={rows} campaigns={campaigns} />
    </div>
  );
}
