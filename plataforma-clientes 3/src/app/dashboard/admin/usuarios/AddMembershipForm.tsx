"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addMembership } from "./actions";

const MINISTRY_ROLE_OPTIONS = [
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
      className="rounded-control border border-line-strong px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-sunken disabled:opacity-60"
    >
      {pending ? "Vinculando..." : "Vincular"}
    </button>
  );
}

export function AddMembershipForm({
  users,
  ministries,
}: {
  users: { id: string; email: string }[];
  ministries: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(addMembership, { error: null as string | null });

  return (
    <form action={formAction} className="rounded-panel border border-line bg-surface p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-ink-2">
        Vincular usuário existente a outro ministério
      </p>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          name="userId"
          required
          defaultValue=""
          className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
        >
          <option value="" disabled>
            Usuário
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>

        <select
          name="ministryId"
          required
          defaultValue=""
          className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
        >
          <option value="" disabled>
            Ministério
          </option>
          {ministries.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          name="role"
          required
          defaultValue=""
          className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
        >
          <option value="" disabled>
            Papel
          </option>
          {MINISTRY_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <p className="mb-3 text-sm text-danger">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
