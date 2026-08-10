import { LoginForm } from "./LoginForm";

const ERROR_MESSAGES: Record<string, string> = {
  "sem-ministerio":
    "Sua conta ainda não está vinculada a nenhum ministério. Fale com a equipe de Comunicação.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const urlErrorMessage = erro ? ERROR_MESSAGES[erro] ?? null : null;

  return (
    <div className="flex min-h-screen">
      {/* Painel de marca — some em telas pequenas */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-walnut-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(243,112,28,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(243,112,28,0.2), transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold">
            AC
          </div>
          <span className="text-sm font-semibold tracking-wide">ATITUDE CREATIVE</span>
        </div>

        <div className="relative">
          <h1 className="mb-4 text-3xl font-semibold leading-tight">
            Portal dos Ministérios
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-walnut-200">
            Um único lugar para acompanhar demandas, campanhas e entregas da
            Comunicação — com transparência e acesso sob medida pra cada
            ministério.
          </p>
        </div>

        <p className="relative text-xs text-walnut-400">
          © {new Date().getFullYear()} Igreja Batista Atitude
        </p>
      </div>

      {/* Formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-cream-50 px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
              AC
            </div>
            <span className="text-sm font-semibold tracking-wide text-walnut-800">
              PORTAL DOS MINISTÉRIOS
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="mb-1 text-xl font-semibold text-neutral-900">Entrar</h2>
            <p className="mb-6 text-sm text-neutral-500">
              Acesse o portal do seu ministério.
            </p>

            <LoginForm urlErrorMessage={urlErrorMessage} />
          </div>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Acesso concedido pela equipe de Comunicação. Fale com a Atitude
            Creative se precisar de um convite.
          </p>
        </div>
      </div>
    </div>
  );
}
