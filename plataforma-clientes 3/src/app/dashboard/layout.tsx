import { redirect } from "next/navigation";
import {
  getCurrentMinistry,
  getUserMemberships,
  getAllMinistries,
  isComunicacaoGlobal,
} from "@/lib/data/ministries";
import { signOut } from "@/app/login/actions";
import { DashboardNav } from "@/components/DashboardNav";
import { MinistrySwitcher } from "@/components/MinistrySwitcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentMinistry();

  if (!current) {
    // Usuário autenticado mas sem vínculo com nenhum ministério ainda.
    redirect("/login?erro=sem-ministerio");
  }

  const { ministry, role, user } = current;
  const comunicacao = isComunicacaoGlobal(user);

  const switcherOptions = comunicacao
    ? await getAllMinistries()
    : (await getUserMemberships()).map((m) => m.ministry);

  return (
    <div className="flex min-h-screen bg-cream-50">
      <aside className="flex w-72 flex-col justify-between bg-walnut-900 p-6">
        <div>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
              AC
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">
                Portal dos Ministérios
              </p>
              <p className="text-xs leading-tight text-walnut-300">Atitude Creative</p>
            </div>
          </div>

          <MinistrySwitcher
            options={switcherOptions.map((m) => ({ id: m.id, name: m.name }))}
            currentId={ministry?.id ?? ""}
          />
          <DashboardNav showAdminLink={comunicacao} />
        </div>

        <div className="border-t border-walnut-800 pt-4">
          <p className="mb-0.5 truncate text-sm font-medium text-white">
            {ministry?.name ?? "Nenhum ministério cadastrado"}
          </p>
          <p className="mb-3 text-xs text-walnut-300">
            {role ? roleLabel(role) : "Comunicação"}
          </p>
          <form action={signOut}>
            <button className="text-sm font-medium text-walnut-300 transition hover:text-brand-400">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-cream-50 p-8">{children}</main>
    </div>
  );
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    leitor: "Leitor do ministério",
    colaborador: "Colaborador do ministério",
    aprovador: "Aprovador do ministério",
    supervisor: "Supervisor",
    atendimento: "Atendimento da Comunicação",
  };
  return labels[role] ?? role;
}
