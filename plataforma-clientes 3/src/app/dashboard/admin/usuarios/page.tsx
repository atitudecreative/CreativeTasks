import { requireComunicacao, getAllMinistries } from "@/lib/data/ministries";
import { listUsersForAdmin } from "@/lib/data/adminUsers";
import { Badge, Icon } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { CreateUserForm } from "./CreateUserForm";
import { UsersAdminExplorer } from "./UsersAdminExplorer";

export const metadata = { title: "Usuários e acessos" };

export default async function AdminUsuariosPage() {
  const currentUser = await requireComunicacao();
  const [users, ministries] = await Promise.all([listUsersForAdmin(), getAllMinistries()]);

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Usuários e acessos"
        description="Agrupados por ministério, com uma seção à parte para quem tem papel global. Um usuário só enxerga os ministérios em que está vinculado."
        meta={
          <>
            <Badge tone="neutral" icon={<Icon.Users className="h-3 w-3" />}>
              {users.length} {users.length === 1 ? "conta" : "contas"}
            </Badge>
            <Badge tone="neutral" icon={<Icon.Building className="h-3 w-3" />}>
              {ministries.length} {ministries.length === 1 ? "ministério" : "ministérios"}
            </Badge>
          </>
        }
        actions={<CreateUserForm ministries={ministries.map((m) => ({ id: m.id, name: m.name }))} />}
      />

      <UsersAdminExplorer
        users={users}
        ministries={ministries.map((m) => ({ id: m.id, name: m.name }))}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
