import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import { getDemandsForMinistry, STATUS_LABEL } from "@/lib/data/demands";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem prazo";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function DemandasPage() {
  const { ministry } = await requireMinistry();

  const demands = await getDemandsForMinistry(ministry.id);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Demandas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Solicitações e entregas da Comunicação para {ministry.name}.
      </p>

      {demands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma demanda publicada ainda para este ministério.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Demanda</th>
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
                  <td className="px-4 py-3 text-neutral-600">{STATUS_LABEL[d.status] ?? d.status}</td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">{d.prioridade ?? "—"}</td>
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
