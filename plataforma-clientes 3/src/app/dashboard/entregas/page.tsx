import { requireMinistry, isComunicacaoGlobal } from "@/lib/data/ministries";
import { getDeliverablesForMinistry } from "@/lib/data/deliverables";
import { getCampaignsForMinistry } from "@/lib/data/campaigns";
import { Badge, Icon } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { NewDeliverableForm } from "./NewDeliverableForm";
import { EntregasExplorer } from "./EntregasExplorer";

export const metadata = { title: "Arquivos" };

export default async function EntregasPage() {
  const { ministry, role, user } = await requireMinistry();

  const [deliverables, campaigns] = await Promise.all([
    getDeliverablesForMinistry(ministry.id),
    getCampaignsForMinistry(ministry.id),
  ]);

  const comunicacao = isComunicacaoGlobal(user);
  // "atendimento" é o papel de Comunicação vinculado a ESTE ministério —
  // mesma regra que já vale pra criar/editar campanha e demanda
  // (can_edit_ministry, migration 0004).
  const canCreate = comunicacao || role === "atendimento";
  const canApprove = comunicacao || role === "aprovador";

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Arquivos"
        description={`Biblioteca de peças, materiais e links finais de ${ministry.name}. Toda entrega é um link — nada fica hospedado no portal.`}
        meta={
          deliverables.length > 0 ? (
            <Badge tone="neutral" icon={<Icon.Folder className="h-3 w-3" />}>
              {deliverables.length} {deliverables.length === 1 ? "arquivo" : "arquivos"}
            </Badge>
          ) : undefined
        }
        actions={canCreate ? <NewDeliverableForm ministryId={ministry.id} campaigns={campaigns} /> : undefined}
      />

      <EntregasExplorer
        deliverables={deliverables}
        campaigns={campaigns.map((c) => ({ id: c.id, nome: c.nome }))}
        canApprove={canApprove}
      />
    </div>
  );
}
