import { requireMinistry } from "@/lib/data/ministries";
import { hoje } from "@/lib/dates";
import {
  getDemandsForMinistry,
  getChildDemandCounts,
  isOverdue,
  STATUS_LABEL,
  PRIORIDADE_LABEL,
} from "@/lib/data/demands";
import { getCampaignsForMinistry, getCampaignsForDemandsInMinistry } from "@/lib/data/campaigns";
import { PageHeader } from "@/components/AppShell";
import { DemandasExplorer } from "./DemandasExplorer";
import type { DemandRow } from "./DemandTable";

export const metadata = { title: "Demandas" };

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem prazo";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export default async function DemandasPage() {
  const { ministry } = await requireMinistry();

  // Busca tudo de uma vez (só o corte de 2026 em diante já aplicado na
  // query) — busca e filtros de status/campanha/prioridade acontecem no
  // client, instantaneamente, sem precisar recarregar a página.
  const [demands, campaigns, campaignsByDemand, childCounts] = await Promise.all([
    getDemandsForMinistry(ministry.id),
    getCampaignsForMinistry(ministry.id),
    getCampaignsForDemandsInMinistry(ministry.id),
    getChildDemandCounts(ministry.id),
  ]);

  // Um "hoje" (em Brasília) para a lista inteira: a mesma data decide
  // o atraso de todas as linhas, e não uma leitura de relógio por linha.
  const hojeBr = hoje();

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
    overdue: isOverdue(d, hojeBr),
    campanhas: campaignsByDemand.get(d.id) ?? [],
    childCount: childCounts.get(d.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Demandas"
        description={`Tudo que a Comunicação está produzindo para ${ministry.name}. Filtre por estágio para ver o que está em produção ou esperando por você.`}
      />

      <DemandasExplorer hoje={hojeBr} demands={rows} campaigns={campaigns} />
    </div>
  );
}
