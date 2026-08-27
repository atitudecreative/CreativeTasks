import { requireComunicacao, getAllMinistries } from "@/lib/data/ministries";
import { getAllCampaignsAdmin, getAllCampaignFoldersAdmin } from "@/lib/data/campaigns";
import { getUnmatchedMetaCampaigns, getAllCampaignNamesForLinking } from "@/lib/data/metaAds";
import { CampaignsAdminTable } from "./CampaignsAdminTable";
import { MetaCampaignMatcher } from "./MetaCampaignMatcher";

export default async function CampanhasAtivasPage() {
  await requireComunicacao();
  const [campaigns, folders, unmatchedMetaCampaigns, portalCampaignNames, ministries] = await Promise.all([
    getAllCampaignsAdmin(),
    getAllCampaignFoldersAdmin(),
    getUnmatchedMetaCampaigns(),
    getAllCampaignNamesForLinking(),
    getAllMinistries(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Campanhas ativas</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Todas as campanhas e eventos, organizados em pastas (útil pra eventos anuais, ex:
        uma pasta "Festa da Roça" com uma campanha por edição). Uma tag é global: se ela
        aparece em mais de um ministério, vira uma campanha só, e cada ministério envolvido
        vê as demandas de todos os outros que compartilham a tag — o nome dos ministérios
        aparece do lado de cada campanha. Toda campanha nasce oculta — use o toggle pra abrir
        pros ministérios verem, ou pra ocultar de novo quando um evento já passou. As
        demandas continuam sincronizando normalmente independente da campanha estar
        visível ou não.
      </p>

      <MetaCampaignMatcher metaCampaigns={unmatchedMetaCampaigns} portalCampaigns={portalCampaignNames} />

      <CampaignsAdminTable campaigns={campaigns} folders={folders} ministries={ministries} />
    </div>
  );
}
