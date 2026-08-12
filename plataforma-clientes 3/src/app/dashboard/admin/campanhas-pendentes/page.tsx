import { requireComunicacao } from "@/lib/data/ministries";
import { getAllCampaignsAdmin } from "@/lib/data/campaigns";
import { CampaignsAdminTable } from "./CampaignsAdminTable";

export default async function CampanhasAtivasPage() {
  await requireComunicacao();
  const campaigns = await getAllCampaignsAdmin();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Campanhas ativas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Todas as campanhas e eventos, agrupados por ministério. Toda campanha nasce oculta
        (ver README) — use o toggle pra abrir pro ministério ver, ou pra ocultar de novo
        quando um evento já passou. As demandas continuam sincronizando normalmente
        independente da campanha estar visível ou não.
      </p>

      <CampaignsAdminTable campaigns={campaigns} />
    </div>
  );
}
