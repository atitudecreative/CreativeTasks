import { requireComunicacao } from "@/lib/data/ministries";
import { getPendingCampaigns } from "@/lib/data/campaigns";
import { PublishCampaignForm } from "./PublishCampaignForm";

export default async function CampanhasPendentesPage() {
  await requireComunicacao();
  const pending = await getPendingCampaigns();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Campanhas ocultas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Toda campanha nasce oculta pro ministério — inclusive campanhas
        antigas, pra não poluir a aba Campanhas com evento já passado. Abra
        só as que ainda fazem sentido mostrar; as demandas continuam
        sincronizando normalmente mesmo com a campanha oculta.
      </p>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma campanha oculta no momento.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((c) => (
            <PublishCampaignForm key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
