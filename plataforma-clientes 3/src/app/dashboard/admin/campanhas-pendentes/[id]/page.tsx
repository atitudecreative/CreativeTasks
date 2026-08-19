import Link from "next/link";
import { notFound } from "next/navigation";
import { requireComunicacao } from "@/lib/data/ministries";
import { getCampaignById } from "@/lib/data/campaigns";
import { EditCampaignForm } from "./EditCampaignForm";

export default async function EditCampanhaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireComunicacao();
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/admin/campanhas-pendentes" className="mb-4 inline-block text-xs text-brand-600 hover:underline">
        ← voltar pra Campanhas ativas
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Editar campanha</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {campaign.nome} —{" "}
        <Link href={`/dashboard/campanhas/${campaign.id}`} className="text-brand-600 hover:underline">
          ver dashboard público
        </Link>
      </p>

      <EditCampaignForm campaign={campaign} />
    </div>
  );
}
