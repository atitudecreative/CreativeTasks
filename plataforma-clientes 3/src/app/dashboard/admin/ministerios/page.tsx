import { requireComunicacao, getAllMinistriesWithCounts } from "@/lib/data/ministries";
import { Badge, Icon } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { MinistriesTable } from "./MinistriesTable";
import { AddMinistryToggle } from "./AddMinistryToggle";

export const metadata = { title: "Ministérios" };

export default async function AdminMinisteriosPage() {
  await requireComunicacao();
  const ministries = await getAllMinistriesWithCounts();

  const ativos = ministries.filter((m) => m.status === "ativo").length;

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Ministérios"
        description="Cadastro dos ministérios, redes e áreas atendidas pela Comunicação. Abra um deles para editar dados, capa e cor."
        meta={
          ministries.length > 0 ? (
            <>
              <Badge tone="neutral" icon={<Icon.Building className="h-3 w-3" />}>
                {ministries.length} {ministries.length === 1 ? "cadastrado" : "cadastrados"}
              </Badge>
              <Badge tone="success" dot>
                {ativos} {ativos === 1 ? "ativo" : "ativos"}
              </Badge>
            </>
          ) : undefined
        }
        actions={<AddMinistryToggle />}
      />

      <MinistriesTable ministries={ministries} />
    </div>
  );
}
