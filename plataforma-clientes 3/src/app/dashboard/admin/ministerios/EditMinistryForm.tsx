"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMinistry } from "./actions";
import { CATEGORIA_OPTIONS } from "@/lib/ministryOptions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Criando..." : "Criar ministério"}
    </button>
  );
}

export function CreateMinistryForm() {
  const [state, formAction] = useFormState(createMinistry, { error: null as string | null });

  return (
    <form action={formAction} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-neutral-700">Novo ministério</p>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Nome *</label>
          <input
            name="name"
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Sigla</label>
          <input
            name="sigla"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Categoria</label>
          <select
            name="categoria"
            defaultValue="ministerio"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {CATEGORIA_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Pastor responsável</label>
          <input
            name="pastorResponsavel"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Ponto focal do ministério</label>
          <input
            name="pontoFocalMinisterio"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Ponto focal da Comunicação</label>
          <input
            name="pontoFocalComunicacao"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {state?.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
