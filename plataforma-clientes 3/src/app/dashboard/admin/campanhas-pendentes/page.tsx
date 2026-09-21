import { requireComunicacao, getAllMinistries } from "@/lib/data/ministries";
import { getAllCampaignsAdmin, getAllCampaignFoldersAdmin } from "@/lib/data/campaigns";
import { getUnmatchedMetaCampaigns, getAllCampaignNamesForLinking } from "@/lib/data/metaAds";
import { Badge, Icon, Alert } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { CampaignsAdminTable } from "./CampaignsAdminTable";
import { MetaCampaignMatcher } from "./MetaCampaignMatcher";

export const metadata = { title: "Campanhas ativas" };

export default async function CampanhasAtivasPage() {
  await requireComunicacao();
  const [campaigns, folders, unmatchedMetaCampaigns, portalCampaignNames, ministries] = await Promise.all([
    getAllCampaignsAdmin(),
    getAllCampaignFoldersAdmin(),
    getUnmatchedMetaCampaigns(),
    getAllCampaignNamesForLinking(),
    getAllMinistries(),
  ]);

  const ocultas = campaigns.filter((c) => !c.publicada).length;

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Campanhas ativas"
        description="Todas as campanhas e eventos, organizados em pastas — útil para evento anual recorrente, com uma campanha por edição."
        meta={
          <>
            <Badge tone="neutral" icon={<Icon.Megaphone className="h-3 w-3" />}>
              {campaigns.length} no total
            </Badge>
            {ocultas > 0 && (
              <Badge tone="warning" icon={<Icon.EyeOff className="h-3 w-3" />}>
                {ocultas} {ocultas === 1 ? "oculta" : "ocultas"}
              </Badge>
            )}
          </>
        }
      />

      {/* O funcionamento das tags globais é a regra menos óbvia desta tela
          e antes vivia num parágrafo de oito linhas acima de tudo. Virou
          um aviso dispensável, que explica sem bloquear a leitura. */}
      <Alert tone="info" title="Como as tags funcionam" className="mb-5">
        Uma tag do Asana é <strong>global</strong>: se ela aparece em mais de um ministério, vira uma campanha só,
        e cada ministério envolvido enxerga as demandas dos outros que compartilham a tag. Toda campanha nasce
        oculta — use o botão de visibilidade para liberar. As demandas continuam sincronizando normalmente,
        estando a campanha visível ou não.
      </Alert>

      <MetaCampaignMatcher metaCampaigns={unmatchedMetaCampaigns} portalCampaigns={portalCampaignNames} />

      <CampaignsAdminTable campaigns={campaigns} folders={folders} ministries={ministries} />
    </div>
  );
}
