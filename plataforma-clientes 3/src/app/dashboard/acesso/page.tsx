import { getCurrentUser, getUserMemberships, isComunicacaoGlobal } from "@/lib/data/ministries";

const ROLE_LABEL: Record<string, string> = {
  leitor: "Leitor do ministério",
  colaborador: "Colaborador do ministério",
  aprovador: "Aprovador do ministério",
  supervisor: "Supervisor",
  atendimento: "Atendimento da Comunicação",
};

const PAPEL_GLOBAL_LABEL: Record<string, string> = {
  nenhum: "Nenhum",
  atendimento: "Atendimento da Comunicação",
  gestor_comunicacao: "Gestor de Comunicação",
  administrador_tecnico: "Administrador técnico",
};

export default async function MeuAcessoPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await getUserMemberships();
  const comunicacao = isComunicacaoGlobal(user);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Meu acesso</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {user.fullName ?? "Sua conta"} — papel global: {PAPEL_GLOBAL_LABEL[user.papelGlobal]}
      </p>

      {comunicacao && (
        <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
          Você tem visão de Comunicação: acesso a todos os ministérios, independente de vínculo direto.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Ministério</th>
              <th className="px-4 py-3 font-medium">Papel</th>
            </tr>
          </thead>
          <tbody>
            {memberships.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={2}>
                  Nenhum vínculo direto com ministério.
                </td>
              </tr>
            ) : (
              memberships.map((m) => (
                <tr key={m.ministry.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-800">{m.ministry.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{ROLE_LABEL[m.role] ?? m.role}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        Para solicitar mudança de acesso, entre em contato com a equipe de Comunicação.
      </p>
    </div>
  );
}
