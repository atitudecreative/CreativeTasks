import { redirect } from "next/navigation";
import {
  getCurrentMinistry,
  getUserMemberships,
  getAllMinistries,
  isComunicacaoGlobal,
} from "@/lib/data/ministries";
import { getSiteTheme } from "@/lib/data/theme";
import { signOut } from "@/app/login/actions";
import { DashboardNav } from "@/components/DashboardNav";
import { MinistrySwitcher } from "@/components/MinistrySwitcher";
import { CommandPalette } from "@/components/CommandPalette";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentMinistry();
  const siteTheme = await getSiteTheme();

  if (!current) {
    // Usuário autenticado mas sem vínculo com nenhum ministério ainda.
    redirect("/login?erro=sem-ministerio");
  }

  const { ministry, role, user } = current;
  const comunicacao = isComunicacaoGlobal(user);

  const switcherOptions = comunicacao
    ? await getAllMinistries()
    : (await getUserMemberships()).map((m) => m.ministry);

  // Quando o ministério ativo tem uma capa (imagem de fundo cadastrada em
  // /dashboard/admin/ministerios/[id]), o menu lateral mostra ela em vez
  // da cor sólida. O gradiente por cima é preto neutro (não a cor de
  // aparência do site) e bem mais transparente — só o suficiente pra
  // logo, nav e nome continuarem legíveis, sem misturar a cor do tema com
  // a foto e sem esconder a imagem escolhida.
  const asideStyle = ministry?.capa_url
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.45)), url(${ministry.capa_url})`,
        backgroundSize: "cover",
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat" as const,
      }
    : undefined;

  return (
    <div className="flex min-h-screen bg-cream-50">
      <aside
        className={`flex w-[300px] flex-col justify-between p-6 ${ministry?.capa_url ? "" : "bg-walnut-900"}`}
        style={asideStyle}
      >
        <div>
          <div className="mb-8 flex flex-col items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo pode
                vir de um arquivo dinâmico (site_theme.logo_url), sem
                dimensões fixas conhecidas em build time */}
            <img
              src={siteTheme.logoUrl ?? "/logo-dark-bg.png"}
              alt="Atitude Creative"
              className="h-14 w-auto object-contain"
            />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-walnut-300">
              Portal dos Ministérios
            </p>
          </div>

          <MinistrySwitcher
            options={switcherOptions.map((m) => ({ id: m.id, name: m.name }))}
            currentId={ministry?.id ?? ""}
          />
          <CommandPalette />
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
