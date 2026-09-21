"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  addMembership,
  updateUserPapelGlobal,
  updateMembershipRole,
  removeMembership,
  deleteUserAccount,
} from "./actions";
import { PAPEL_GLOBAL_OPTIONS, PAPEL_GLOBAL_LABEL, MINISTRY_ROLE_OPTIONS, MINISTRY_ROLE_LABEL } from "@/lib/userOptions";

export type UserRowData = {
  id: string;
  email: string;
  fullName: string | null;
  papelGlobal: string;
  memberships: { ministryId: string; ministryName: string; role: string }[];
};

function SaveButton({ label = "Salvar" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

function PapelGlobalEditor({ user, isSelf }: { user: UserRowData; isSelf: boolean }) {
  const [state, formAction] = useFormState(updateUserPapelGlobal, { error: null as string | null });

  if (isSelf) {
    return (
      <p className="text-xs text-ink-3">
        Você não pode alterar o próprio papel — peça a outro administrador.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={user.id} />
      <select
        name="papelGlobal"
        defaultValue={user.papelGlobal}
        className="rounded-control border border-line-strong px-2 py-1.5 text-xs outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
      >
        {PAPEL_GLOBAL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <SaveButton />
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}

function MembershipRoleEditor({ userId, ministryId, role }: { userId: string; ministryId: string; role: string }) {
  const [, formAction] = useFormState(updateMembershipRole, { error: null as string | null });

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="ministryId" value={ministryId} />
      <select
        name="role"
        defaultValue={role}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-control border border-line-strong px-2 py-1 text-xs outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
      >
        {MINISTRY_ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}

function RemoveMembershipButton({ userId, ministryId, ministryName }: { userId: string; ministryId: string; ministryName: string }) {
  return (
    <form
      action={removeMembership}
      onSubmit={(e) => {
        if (!window.confirm(`Remover o vínculo com "${ministryName}"?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="ministryId" value={ministryId} />
      <button type="submit" className="text-caption font-medium text-ink-3 hover:text-danger">
        Remover
      </button>
    </form>
  );
}

function AddMembershipInline({ userId, availableMinistries }: { userId: string; availableMinistries: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(addMembership, { error: null as string | null });

  if (availableMinistries.length === 0) {
    return <p className="text-xs text-ink-3">Já vinculado a todos os ministérios cadastrados.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="ministryId"
        required
        defaultValue=""
        className="rounded-control border border-line-strong px-2 py-1.5 text-xs outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
      >
        <option value="" disabled>
          Ministério
        </option>
        {availableMinistries.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <select
        name="role"
        required
        defaultValue=""
        className="rounded-control border border-line-strong px-2 py-1.5 text-xs outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
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
      <SaveButton label="Adicionar" />
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}

function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  return (
    <form
      action={deleteUserAccount}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          `Excluir a conta de "${email}"? Essa ação não pode ser desfeita — todos os vínculos com ministérios também são apagados.`
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className="text-xs font-medium text-danger hover:underline">
        Excluir usuário
      </button>
    </form>
  );
}

export function UserRow({
  user,
  currentUserId,
  allMinistries,
}: {
  user: UserRowData;
  currentUserId: string;
  allMinistries: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const isSelf = user.id === currentUserId;
  const linkedIds = new Set(user.memberships.map((m) => m.ministryId));
  const availableMinistries = allMinistries.filter((m) => !linkedIds.has(m.id));

  return (
    <div className="border-b border-line px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">
            {user.fullName || user.email}
            {isSelf && <span className="ml-2 text-xs font-normal text-ink-3">(você)</span>}
          </p>
          <p className="truncate text-xs text-ink-2">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {user.papelGlobal !== "nenhum" && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              {PAPEL_GLOBAL_LABEL[user.papelGlobal] ?? user.papelGlobal}
            </span>
          )}
          {user.memberships.map((m) => (
            <span key={m.ministryId} className="rounded-full bg-neutral-soft px-2 py-0.5 text-xs text-ink-2">
              {m.ministryName} · {MINISTRY_ROLE_LABEL[m.role] ?? m.role}
            </span>
          ))}
          {user.memberships.length === 0 && user.papelGlobal === "nenhum" && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">Sem acesso</span>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-1 text-xs font-medium text-brand-600 hover:underline"
          >
            {open ? "Fechar" : "Editar"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-4 rounded-card bg-surface-sunken p-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Papel global</p>
            <PapelGlobalEditor user={user} isSelf={isSelf} />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">
              Vínculos por ministério
            </p>
            {user.memberships.length === 0 ? (
              <p className="text-xs text-ink-3">Nenhum vínculo ainda.</p>
            ) : (
              <div className="space-y-1.5">
                {user.memberships.map((m) => (
                  <div key={m.ministryId} className="flex items-center justify-between gap-2 rounded-control bg-surface px-2.5 py-1.5">
                    <span className="text-xs font-medium text-ink-2">{m.ministryName}</span>
                    <div className="flex items-center gap-2">
                      <MembershipRoleEditor userId={user.id} ministryId={m.ministryId} role={m.role} />
                      <RemoveMembershipButton userId={user.id} ministryId={m.ministryId} ministryName={m.ministryName} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2">
              <AddMembershipInline userId={user.id} availableMinistries={availableMinistries} />
            </div>
          </div>

          {!isSelf && (
            <div className="border-t border-line pt-3">
              <DeleteUserButton userId={user.id} email={user.email} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
