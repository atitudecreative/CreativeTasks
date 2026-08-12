import { requireComunicacao, getAllMinistriesWithCounts } from "@/lib/data/ministries";
import { MinistriesTable } from "./MinistriesTable";
import { AddMinistryToggle } from "./AddMinistryToggle";

export default async function AdminMinisteriosPage() {
  await requireComunicacao();
  const ministries = await getAllMinistriesWithCounts();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Ministérios</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Cadastro dos ministérios, redes e áreas atendidas pela Comunicação. Clique num
        nome pra editar; use "Excluir" pra remover um cadastro por completo.
      </p>

      <MinistriesTable ministries={ministries} />

      <AddMinistryToggle />
    </div>
  );
}
