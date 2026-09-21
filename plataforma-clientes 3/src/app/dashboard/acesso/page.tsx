import { getCurrentUser, getUserMemberships, isComunicacaoGlobal } from "@/lib/data/ministries";
import { Alert, Avatar, Badge, EmptyState, Icon, Panel, Section, Table, TBody, TD, TH, THead, TR, TableScroll } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";

export const metadata = { title: "Meu acesso" };

const ROLE: Record<string, { label: string; description: string }> = {
  leitor: { label: "Leitor", description: "Acompanha demandas, campanhas e arquivos do ministério." },
  colaborador: { label: "Colaborador", description: "Acompanha e participa das conversas das demandas." },
  aprovador: { label: "Aprovador", description: "Além de acompanhar, aprova as entregas do ministério." },
  supervisor: { label: "Supervisor", description: "Visão completa do ministério." },
  atendimento: { label: "Atendimento", description: "Equipe da Comunicação responsável por este ministério." },
};

const PAPEL_GLOBAL: Record<string, string> = {
  nenhum: "Sem papel global",
  atendimento: "Atendimento da Comunicação",
  gestor_comunicacao: "Gestor de Comunicação",
  administrador_tecnico: "Administrador técnico",
};

/* Antes: uma tabela de duas colunas com o papel por extenso e nada
   explicando o que cada papel PODE fazer — que é exatamente a dúvida de
   quem abre essa tela. Agora cada papel vem com sua descrição. */
export default async function MeuAcessoPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await getUserMemberships();
  const comunicacao = isComunicacaoGlobal(user);
  const nome = user.fullName ?? user.email ?? "Sua conta";

  return (
    <div className="mx-auto max-w-report">
      <PageHeader eyebrow="Conta" title="Meu acesso" description="Onde você entra e o que pode fazer em cada lugar." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Sua conta">
          <div className="flex items-start gap-3">
            <Avatar name={nome} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-h4 text-ink">{nome}</p>
              {user.email && <p className="mt-0.5 truncate text-caption text-ink-3">{user.email}</p>}
              <Badge tone={comunicacao ? "accent" : "neutral"} size="sm" className="mt-2">
                {PAPEL_GLOBAL[user.papelGlobal] ?? user.papelGlobal}
              </Badge>
            </div>
          </div>
        </Panel>

        <div className="lg:col-span-2">
          {comunicacao ? (
            <Alert tone="accent" title="Visão de Comunicação" className="mb-4">
              Você enxerga <strong>todos os ministérios</strong> cadastrados, independente de vínculo direto —
              é por isso que o seletor no topo do menu lista a carteira inteira.
            </Alert>
          ) : null}

          <Panel title="Ministérios vinculados" description="Um papel por vínculo" noPadding>
            {memberships.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  size="sm"
                  icon={<Icon.Building className="h-4 w-4" />}
                  title={comunicacao ? "Nenhum vínculo direto" : "Nenhum ministério vinculado"}
                  description={
                    comunicacao
                      ? "Você não precisa de vínculo: o papel global já dá acesso a todos."
                      : "Fale com a equipe de Comunicação para receber acesso a um ministério."
                  }
                />
              </div>
            ) : (
              <TableScroll>
                <Table>
                  <THead>
                    <TR>
                      <TH>Ministério</TH>
                      <TH>Papel</TH>
                      <TH className="hidden sm:table-cell">O que isso permite</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {memberships.map((m) => {
                      const role = ROLE[m.role];
                      return (
                        <TR key={m.ministry.id}>
                          <TD strong>
                            <span className="flex items-center gap-2.5">
                              <Avatar name={m.ministry.name} size="xs" />
                              {m.ministry.name}
                            </span>
                          </TD>
                          <TD>
                            <Badge tone="neutral" size="sm">
                              {role?.label ?? m.role}
                            </Badge>
                          </TD>
                          <TD className="hidden sm:table-cell">{role?.description ?? "—"}</TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableScroll>
            )}
          </Panel>

          <p className="mt-3 text-caption text-ink-3">
            Para pedir mudança de acesso, fale com a equipe de Comunicação.
          </p>
        </div>
      </div>
    </div>
  );
}
