import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireComunicacao, getAllMinistries } from "@/lib/data/ministries";
import { getCampaignById, getCampaignManualMinistryIds } from "@/lib/data/campaigns";
import { Breadcrumb, Button, Icon } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { EditCampaignForm } from "./EditCampaignForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  return { title: campaign ? `Editar ${campaign.nome}` : "Editar campanha" };
}

export default async function EditCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireComunicacao();
  const { id } = await params;
  const [campaign, ministries, manualMinistryIds] = await Promise.all([
    getCampaignById(id),
    getAllMinistries(),
    getCampaignManualMinistryIds(id),
  ]);
  if (!campaign) notFound();

  return (
    <div className="mx-auto max-w-report">
      <Breadcrumb
        items={[
          { label: "Campanhas ativas", href: "/dashboard/admin/campanhas-pendentes" },
          { label: campaign.nome },
        ]}
        className="mb-3"
      />

      <PageHeader
        eyebrow="Administração"
        title="Editar campanha"
        description={campaign.nome}
        actions={
          <Link href={`/dashboard/campanhas/${campaign.id}`}>
            <Button variant="secondary" iconRight={<Icon.ArrowUpRight className="h-4 w-4" />}>
              Ver relatório
            </Button>
          </Link>
        }
      />

      <EditCampaignForm campaign={campaign} ministries={ministries} manualMinistryIds={manualMinistryIds} />
    </div>
  );
}
