import type { Metadata } from "next";
import { getSiteTheme } from "@/lib/data/theme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesso ao Portal dos Ministérios da Atitude Creative.",
};

const ERROR_MESSAGES: Record<string, string> = {
  "sem-ministerio":
    "Sua conta ainda não está vinculada a nenhum ministério. Fale com a equipe de Comunicação para liberar o acesso.",
};

/* =========================================================================
   LOGIN
   -------------------------------------------------------------------------
   Primeira coisa que qualquer pessoa vê do produto — e a versão anterior
   já tinha a estrutura certa (painel de marca + formulário). O que mudou:

   - O painel de marca deixa de ser um bloco marrom com dois borrões
     radiais laranja e passa a dizer o que a plataforma faz, com três
     provas concretas. Espaço de marca sem conteúdo é espaço desperdiçado.
   - A malha de fundo é geométrica e discreta (uma grade de linhas), não
     um gradiente — combina com a direção "instrumento de dados" e não
     compete com a logo.
   - Mostrar/ocultar senha, foco automático e mensagem de erro com ícone.
   ========================================================================= */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const urlErrorMessage = erro ? ERROR_MESSAGES[erro] ?? null : null;
  const siteTheme = await getSiteTheme();

  const provas = [
    { icon: Icon.Megaphone, text: "Cada evento com investimento, alcance e resultado no mesmo lugar" },
    { icon: Icon.ListChecks, text: "Acompanhamento das demandas em produção, em tempo real" },
    { icon: Icon.Folder, text: "Biblioteca com todas as peças e materiais finais" },
  ];

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* ---------------- Painel de marca (>= lg) ---------------- */}
      <div className="relative hidden w-[46%] max-w-2xl flex-col justify-between overflow-hidden bg-walnut-900 p-10 text-white lg:flex xl:p-12">
        {/* Malha técnica: grade fina de 40px, quase imperceptível, com um
            halo suave da cor de marca no canto. Dá profundidade sem virar
            gradiente decorativo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at 30% 25%, black, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse at 30% 25%, black, transparent 72%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "rgb(var(--brand-500))" }}
        />

        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo vem de upload dinâmico (site_theme.logo_url) */}
          <img
            src={siteTheme.logoUrl ?? "/logo-dark-bg.png"}
            alt="Atitude Creative"
            className="h-10 w-auto object-contain"
          />
        </div>

        <div className="relative max-w-md">
          <p className="mb-3 font-mono text-label uppercase text-white/45">Portal dos Ministérios</p>
          <h1 className="text-display-sm leading-tight text-white">
            A prestação de contas de cada evento, em um lugar só.
          </h1>
          <ul className="mt-7 space-y-3.5">
            {provas.map((p) => (
              <li key={p.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-white/10 text-white/70">
                  <p.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-small leading-relaxed text-white/70">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-label uppercase text-white/35">
          © {new Date().getFullYear()} Igreja Batista Atitude
        </p>
      </div>

      {/* ---------------- Formulário ---------------- */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-12 lg:w-[54%]">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          {/* Marca compacta no celular, onde o painel lateral não existe. */}
          <div className="mb-8 lg:hidden">
            <div className="mb-3 inline-flex rounded-card bg-walnut-900 px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo vem de upload dinâmico */}
              <img
                src={siteTheme.logoUrl ?? "/logo-dark-bg.png"}
                alt="Atitude Creative"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="font-mono text-label uppercase text-ink-3">Portal dos Ministérios</p>
          </div>

          <h2 className="text-h1 text-ink">Entrar</h2>
          <p className="mb-7 mt-1.5 text-small text-ink-2">Acesse o portal do seu ministério.</p>

          <LoginForm urlErrorMessage={urlErrorMessage} />

          <p className="mt-8 text-caption leading-relaxed text-ink-3">
            O acesso é concedido pela equipe de Comunicação. Se você ainda não tem conta ou perdeu
            a senha, fale com a Atitude Creative.
          </p>
        </div>
      </div>
    </div>
  );
}
