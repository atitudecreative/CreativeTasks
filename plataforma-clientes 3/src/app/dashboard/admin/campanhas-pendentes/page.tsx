import { requireComunicacao, getAllMinistries } from "@/lib/data/ministries";
import { getAllCampaignsAdmin, getAllCampaignFoldersAdmin } from "@/lib/data/campaigns";
import { getUnmatchedMetaCampaigns, getAllCampaignNamesForLinking } from "@/lib/data/metaAds";
import { Badge, Icon } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { CampaignsAdminTable } from "./CampaignsAdminTable";
import { MetaCampaignMatcher } from "./MetaCampaignMatcher";

export const metadata = { title: "Publicação de campanhas" };

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
        title="Publicação de campanhas"
        description="Decida o que cada ministério enxerga: toda campanha nasce oculta e só aparece para o ministério depois de publicada aqui. Pastas agrupam edições de um evento recorrente."
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

      {/* O funcionamento das tags globais é a regra menos óbvia desta tela.
          Aberto, era um bloco azul de quatro linhas acima de tudo em toda
          visita — quem já sabe não precisa reler. Recolhido, continua a
          um clique, e sem JavaScript (details/summary nativos). */}
      <details className="group mb-5 rounded-card border border-info-line bg-info-soft text-small text-ink-2">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-4 py-2 font-medium text-ink [&::-webkit-details-marker]:hidden">
          <Icon.Info className="h-4 w-4 shrink-0 text-info" />
          Como as tags do Asana viram campanhas
          <Icon.ChevronDown className="ml-auto h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
        </summary>
        <p className="px-4 pb-3 pl-10 leading-relaxed">
          Uma tag do Asana é <strong>global</strong>: se ela aparece em mais de um ministério, vira uma campanha
          só, e cada ministério envolvido enxerga as demandas dos outros que compartilham a tag. Toda campanha
          nasce oculta — ligue <strong>Visível</strong> para liberar. As demandas continuam sincronizando
          normalmente, estando a campanha visível ou não.
        </p>
      </details>

      <MetaCampaignMatcher metaCampaigns={unmatchedMetaCampaigns} portalCampaigns={portalCampaignNames} />

      <CampaignsAdminTable campaigns={campaigns} folders={folders} ministries={ministries} />
    </div>
  );
}
