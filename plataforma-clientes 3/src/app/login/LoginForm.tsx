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
