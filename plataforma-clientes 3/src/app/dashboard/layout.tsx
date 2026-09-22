import { redirect } from "next/navigation";
import {
  getCurrentMinistry,
  getUserMemberships,
  getAllMinistries,
  isComunicacaoGlobal,
} from "@/lib/data/ministries";
import { getSiteTheme } from "@/lib/data/theme";
import { getNavCounters } from "@/lib/data/navCounters";
import { signOut } from "@/app/login/actions";
import { AppShell } from "@/components/AppShell";

const ROLE_LABEL: Record<string, string> = {
  leitor: "Leitor",
  colaborador: "Colaborador",
  aprovador: "Aprovador",
  supervisor: "Supervisor",
  atendimento: "Atendimento",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentMinistry();
  const siteTheme = await getSiteTheme();

  if (!current) {
    // Autenticado mas sem vínculo com nenhum ministério ainda.
    redirect("/login?erro=sem-ministerio");
  }

  const { ministry, role, user } = current;
  const comunicacao = isComunicacaoGlobal(user);

  const [switcherOptions, counters] = await Promise.all([
    comunicacao ? getAllMinistries() : getUserMemberships().then((ms) => ms.map((m) => m.ministry)),
    // Sem ministério ativo não há o que contar (Comunicação sem nenhum
    // ministério cadastrado ainda).
    ministry ? getNavCounters(ministry.id) : Promise.resolve(undefined),
  ]);

  return (
    <AppShell
      logoUrl={siteTheme.logoUrl}
      ministryName={ministry?.name ?? "Sem ministério"}
      ministryCapa={ministry?.capa_url ?? null}
      roleLabel={role ? ROLE_LABEL[role] ?? role : "Comunicação"}
      userName={user?.fullName ?? user?.email ?? "Usuário"}
      userEmail={user?.email ?? ""}
      isAdmin={comunicacao}
      switcherOptions={switcherOptions.map((m) => ({ id: m.id, name: m.name }))}
      currentMinistryId={ministry?.id ?? ""}
      signOutAction={signOut}
      counters={counters}
    >
      {children}
    </AppShell>
  );
}
