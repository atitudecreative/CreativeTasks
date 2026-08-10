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

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function LoginForm({ urlErrorMessage }: { urlErrorMessage: string | null }) {
  const [state, formAction] = useFormState(signIn, { error: null as string | null });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">E-mail</label>
        <input
          type="email"
          name="email"
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Senha</label>
        <input
          type="password"
          name="password"
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {(state?.error || urlErrorMessage) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state?.error ?? urlErrorMessage}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
