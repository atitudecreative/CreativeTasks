import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import {
  getDemandsForMinistry,
  groupDemandsByMonth,
  formatMonthLabel,
  STATUS_LABEL,
  PRIORIDADE_LABEL,
} from "@/lib/data/demands";
import { getCampaignsForMinistry, getCampaignsForDemandsInMinistry } from "@/lib/data/campaigns";
import { MonthAccordion, type DemandRow } from "./MonthAccordion";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem prazo";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function DemandasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; campanha?: string; prioridade?: string }>;
}) {
  const { ministry } = await requireMinistry();
  const params = await searchParams;

  const [demands, campaigns] = await Promise.all([
    getDemandsForMinistry(ministry.id, {
      status: params.status,
      campaignId: params.campanha,
      prioridade: params.prioridade,
    }),
    getCampaignsForMinistry(ministry.id),
  ]);

  const campaignsByDemand = await getCampaignsForDemandsInMinistry(ministry.id);
  const hasFilters = Boolean(params.status || params.campanha || params.prioridade);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Demandas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Solicitações e entregas da Comunicação para {ministry.name}.
      </p>

      <form
        method="get"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Campanha ou evento</label>
          <select
            name="campanha"
            defaultValue={params.campanha ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todas</option>
            <option value="none">Sem campanha</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Prioridade</label>
          <select
            name="prioridade"
            defaultValue={params.prioridade ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todas</option>
            {Object.entries(PRIORIDADE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Filtrar
        </button>

        {hasFilters && (
          <Link href="/dashboard/demandas" className="text-sm text-neutral-500 hover:underline">
            Limpar filtros
          </Link>
        )}
      </form>

      {demands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          {hasFilters
            ? "Nenhuma demanda encontrada para esse filtro."
            : "Nenhuma demanda publicada ainda para este ministério a partir de 2026."}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(groupDemandsByMonth(demands)).map(([monthKey, monthDemands]) => {
            const rows: DemandRow[] = monthDemands.map((d) => ({
              id: d.id,
              identificador: d.identificador,
              titulo: d.titulo,
              status: d.status,
              statusLabel: STATUS_LABEL[d.status] ?? d.status,
              prioridadeLabel: d.prioridade ? PRIORIDADE_LABEL[d.prioridade] ?? d.prioridade : null,
              prazoFormatted: formatDate(d.prazo_acordado),
              campanhas: campaignsByDemand.get(d.id) ?? [],
            }));

            return <MonthAccordion key={monthKey} monthLabel={formatMonthLabel(monthKey)} demands={rows} />;
          })}
        </div>
      )}
    </div>
  );
}
