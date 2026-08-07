import { requireComunicacao, getAllMinistries } from "@/lib/data/ministries";
import { listUsersForAdmin } from "@/lib/data/adminUsers";
import { CreateUserForm } from "./CreateUserForm";
import { AddMembershipForm } from "./AddMembershipForm";

const PAPEL_GLOBAL_LABEL: Record<string, string> = {
  nenhum: "—",
  atendimento: "Atendimento da Comunicação",
  gestor_comunicacao: "Gestor de Comunicação",
  administrador_tecnico: "Administrador técnico",
};

export default async function AdminUsuariosPage() {
  await requireComunicacao();

  const [users, ministries] = await Promise.all([listUsersForAdmin(), getAllMinistries()]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Usuários e acessos</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Contas com acesso ao portal, papel global e vínculos por ministério.
      </p>

      <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Papel global</th>
              <th className="px-4 py-3 font-medium">Ministérios</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={4}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-800">{u.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{u.fullName ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {PAPEL_GLOBAL_LABEL[u.papelGlobal] ?? u.papelGlobal}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {u.memberships.length === 0
                      ? "—"
                      : u.memberships.map((m) => `${m.ministryName} (${m.role})`).join(", ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-6">
        <CreateUserForm ministries={ministries.map((m) => ({ id: m.id, name: m.name }))} />
      </div>

      {users.length > 0 && ministries.length > 0 && (
        <AddMembershipForm
          users={users.map((u) => ({ id: u.id, email: u.email }))}
          ministries={ministries.map((m) => ({ id: m.id, name: m.name }))}
        />
      )}
    </div>
  );
}
