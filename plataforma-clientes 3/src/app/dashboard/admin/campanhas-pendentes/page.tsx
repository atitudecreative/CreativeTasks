import { requireComunicacao } from "@/lib/data/ministries";
import { getPendingCampaigns, getVisibleCampaignsAdmin } from "@/lib/data/campaigns";
import { PublishCampaignForm } from "./PublishCampaignForm";
import { hideCampaign } from "./actions";

export default async function CampanhasPendentesPage() {
  await requireComunicacao();
  const [pending, visible] = await Promise.all([
    getPendingCampaigns(),
    getVisibleCampaignsAdmin(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Visibilidade das campanhas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Toda campanha nasce oculta pro ministério — inclusive campanhas
        antigas, pra não poluir a aba Campanhas com evento já passado. Abra
        só as que ainda fazem sentido mostrar, e oculte de novo quando um
        evento já passou. As demandas continuam sincronizando normalmente
        independente da campanha estar visível ou não.
      </p>

      <h2 className="mb-3 text-sm font-semibold text-neutral-700">
        Ocultas {pending.length > 0 && `(${pending.length})`}
      </h2>
      {pending.length === 0 ? (
        <div className="mb-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma campanha oculta no momento.
        </div>
      ) : (
        <div className="mb-8 space-y-4">
          {pending.map((c) => (
            <PublishCampaignForm key={c.id} campaign={c} />
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-neutral-700">
        Visíveis pro ministério {visible.length > 0 && `(${visible.length})`}
      </h2>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma campanha visível no momento.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Campanha</th>
                <th className="px-4 py-3 font-medium">Ministério</th>
                <th className="px-4 py-3 font-medium">Demandas</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-800">{c.nome}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.ministryName}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.demandCount}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={hideCampaign}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-neutral-500 hover:text-brand-700"
                      >
                        Ocultar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
