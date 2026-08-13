import { requireComunicacao, getAllMinistries } from "@/lib/data/ministries";
import { listUsersForAdmin } from "@/lib/data/adminUsers";
import { CreateUserForm } from "./CreateUserForm";
import { UsersAdminExplorer } from "./UsersAdminExplorer";

export default async function AdminUsuariosPage() {
  const currentUser = await requireComunicacao();

  const [users, ministries] = await Promise.all([listUsersForAdmin(), getAllMinistries()]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Usuários e acessos</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Separado por ministério, com uma seção à parte pra quem tem papel global (acesso amplo).
        Um usuário só vê e só pode selecionar os ministérios em que está vinculado abaixo.
      </p>

      <UsersAdminExplorer
        users={users}
        ministries={ministries.map((m) => ({ id: m.id, name: m.name }))}
        currentUserId={currentUser.id}
      />

      <div className="mt-6">
        <CreateUserForm ministries={ministries.map((m) => ({ id: m.id, name: m.name }))} />
      </div>
    </div>
  );
}
