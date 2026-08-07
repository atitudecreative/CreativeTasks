import { requireMinistry } from "@/lib/data/ministries";
import { getDeliverablesForMinistry, DELIVERABLE_STATUS_LABEL } from "@/lib/data/deliverables";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function EntregasPage() {
  const { ministry } = await requireMinistry();

  const deliverables = await getDeliverablesForMinistry(ministry.id);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Entregas e arquivos</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Biblioteca de peças, materiais e links finais de {ministry.name}.
      </p>

      {deliverables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma entrega registrada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((d) => (
            <div key={d.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-medium text-neutral-800">{d.titulo}</p>
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {DELIVERABLE_STATUS_LABEL[d.status] ?? d.status}
                </span>
              </div>
              <p className="mb-3 text-xs text-neutral-400">
                {d.tipo_arquivo ?? "arquivo"} {d.versao ? `· v${d.versao}` : ""} · {formatDate(d.data_entrega)}
              </p>
              {d.link_principal && (
                <a
                  href={d.link_principal}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand-600 hover:underline"
                >
                  Abrir entrega
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
