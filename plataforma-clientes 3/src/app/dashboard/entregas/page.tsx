import { requireMinistry, isComunicacaoGlobal } from "@/lib/data/ministries";
import { getDeliverablesForMinistry } from "@/lib/data/deliverables";
import { getCampaignsForMinistry } from "@/lib/data/campaigns";
import { DeliverableCard } from "@/components/DeliverableCard";
import { NewDeliverableForm } from "./NewDeliverableForm";

export default async function EntregasPage() {
  const { ministry, role, user } = await requireMinistry();

  const [deliverables, campaigns] = await Promise.all([
    getDeliverablesForMinistry(ministry.id),
    getCampaignsForMinistry(ministry.id),
  ]);

  const comunicacao = isComunicacaoGlobal(user);
  // "atendimento" é o papel de Comunicação vinculado a esse ministério
  // específico — mesma regra que já vale pra criar/editar campanha e
  // demanda (can_edit_ministry, migration 0004).
  const canCreate = comunicacao || role === "atendimento";
  const canApprove = comunicacao || role === "aprovador";

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Arquivos Importantes</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Biblioteca de peças, materiais e links finais de {ministry.name}. Toda entrega é um link
        (Drive, YouTube, etc.) — nada fica hospedado no portal.
      </p>

      {canCreate && <NewDeliverableForm ministryId={ministry.id} campaigns={campaigns} />}

      {deliverables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma entrega registrada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((d) => (
            <DeliverableCard key={d.id} deliverable={d} canApprove={canApprove} />
          ))}
        </div>
      )}
    </div>
  );
}
