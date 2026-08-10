import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import { getDemandsForMinistry, STATUS_LABEL, PRIORIDADE_LABEL } from "@/lib/data/demands";
import { getCampaignsForMinistry } from "@/lib/data/campaigns";

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

  const campaignMap = new Map(campaigns.map((c) => [c.id, c.nome]));
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
            : "Nenhuma demanda publicada ainda para este ministério."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Demanda</th>
                <th className="px-4 py-3 font-medium">Campanha/evento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {demands.map((d) => (
                <tr key={d.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/demandas/${d.id}`} className="font-medium text-neutral-800 hover:underline">
                      {d.titulo}
                    </Link>
                    {d.identificador && (
                      <span className="ml-2 text-xs text-neutral-400">{d.identificador}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {d.campaign_id ? campaignMap.get(d.campaign_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{STATUS_LABEL[d.status] ?? d.status}</td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">
                    {d.prioridade ? PRIORIDADE_LABEL[d.prioridade] ?? d.prioridade : "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(d.prazo_acordado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
