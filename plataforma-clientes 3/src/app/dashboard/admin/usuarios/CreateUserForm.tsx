"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createUser } from "./actions";

const PAPEL_GLOBAL_OPTIONS = [
  { value: "nenhum", label: "Nenhum (só o que for vinculado por ministério)" },
  { value: "atendimento", label: "Atendimento da Comunicação" },
  { value: "gestor_comunicacao", label: "Gestor de Comunicação" },
  { value: "administrador_tecnico", label: "Administrador técnico" },
];

const MINISTRY_ROLE_OPTIONS = [
  { value: "", label: "— nenhum —" },
  { value: "leitor", label: "Leitor" },
  { value: "colaborador", label: "Colaborador" },
  { value: "aprovador", label: "Aprovador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "atendimento", label: "Atendimento" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Criando..." : "Criar usuário"}
    </button>
  );
}

export function CreateUserForm({ ministries }: { ministries: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createUser, { error: null as string | null });

  return (
    <form action={formAction} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-neutral-700">Novo usuário</p>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Nome</label>
          <input
            name="fullName"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">E-mail *</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Senha inicial *</label>
          <input
            name="password"
            type="text"
            required
            minLength={6}
            placeholder="mínimo 6 caracteres"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Papel global</label>
          <select
            name="papelGlobal"
            defaultValue="nenhum"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {PAPEL_GLOBAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Vincular a um ministério</label>
          <select
            name="ministryId"
            defaultValue=""
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">— nenhum —</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Papel nesse ministério</label>
          <select
            name="ministryRole"
            defaultValue=""
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {MINISTRY_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
