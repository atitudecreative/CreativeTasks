import { requireComunicacao } from "@/lib/data/ministries";
import { getSecoesVistas, getRegrasStatus, resolverSecoes, regrasGlobaisOrfas } from "@/lib/data/asanaMapping";
import { Alert, Badge, Icon } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { MapeamentoTable } from "./MapeamentoTable";

export const metadata = { title: "Integração com o Asana" };

export default async function AsanaConfigPage() {
  await requireComunicacao();

  const [secoes, regras] = await Promise.all([getSecoesVistas(), getRegrasStatus()]);
  const configuradas = resolverSecoes(secoes, regras);
  const orfas = regrasGlobaisOrfas(secoes, regras);

  const semRegra = configuradas.filter((s) => s.origem === "padrao").length;
  const quadros = new Set(configuradas.map((s) => s.ministryId)).size;

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Integração com o Asana"
        description="Define o que cada coluna dos quadros significa no portal. É isso que faz o status da demanda refletir onde o card realmente está."
        meta={
          configuradas.length > 0 ? (
            <>
              <Badge tone="neutral" icon={<Icon.Layers className="h-3 w-3" />}>
                {configuradas.length} {configuradas.length === 1 ? "coluna" : "colunas"}
              </Badge>
              <Badge tone="neutral" icon={<Icon.Building className="h-3 w-3" />}>
                {quadros} {quadros === 1 ? "quadro" : "quadros"}
              </Badge>
              {semRegra > 0 && (
                <Badge tone="warning" icon={<Icon.AlertTriangle className="h-3 w-3" />}>
                  {semRegra} sem regra
                </Badge>
              )}
            </>
          ) : undefined
        }
      />

      <Alert tone="info" title="Como funciona" className="mb-5">
        <p className="mb-2">
          O sync lê em qual <strong>coluna do quadro</strong> cada card está e grava o status
          correspondente. A regra de um ministério vence a regra global; sem nenhuma regra, a demanda
          entra como <strong>Em produção</strong>.
        </p>
        <p>
          Card marcado como concluído no Asana sempre vira <strong>Concluída</strong>, esteja em que
          coluna estiver. Subtarefa não tem coluna própria, então segue o mesmo padrão.
        </p>
        <p className="mt-2 text-caption">
          Mudanças aqui valem a partir da <strong>próxima sincronização</strong> — não reescrevem o
          que já está gravado até ela rodar.
        </p>
      </Alert>

      <MapeamentoTable secoes={configuradas} orfas={orfas} />
    </div>
  );
}
