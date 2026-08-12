"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateMinistry } from "./actions";
import { CATEGORIA_OPTIONS, MINISTRY_STATUS_OPTIONS } from "@/lib/ministryOptions";

// Tipo só com o que o form precisa — evita importar o tipo MinistryDetail
// (que vem de um arquivo que puxa o cliente Supabase de servidor) num
// Client Component.
type EditableMinistry = {
  id: string;
  name: string;
  sigla: string | null;
  categoria: string;
  status: string;
  description: string | null;
  pastor_responsavel: string | null;
  ponto_focal_ministerio: string | null;
  ponto_focal_comunicacao: string | null;
  centro_custo: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

export function EditMinistryForm({ ministry }: { ministry: EditableMinistry }) {
  const [state, formAction] = useFormState(updateMinistry, { error: null as string | null });

  return (
    <form action={formAction} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={ministry.id} />

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Nome *</label>
          <input
            name="name"
            required
            defaultValue={ministry.name}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Sigla</label>
          <input
            name="sigla"
            defaultValue={ministry.sigla ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Categoria</label>
          <select
            name="categoria"
            defaultValue={ministry.categoria}
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
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={ministry.status}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {MINISTRY_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Pastor responsável</label>
          <input
            name="pastorResponsavel"
            defaultValue={ministry.pastor_responsavel ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Centro de custo</label>
          <input
            name="centroCusto"
            defaultValue={ministry.centro_custo ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Ponto focal do ministério</label>
          <input
            name="pontoFocalMinisterio"
            defaultValue={ministry.ponto_focal_ministerio ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Ponto focal da Comunicação</label>
          <input
            name="pontoFocalComunicacao"
            defaultValue={ministry.ponto_focal_comunicacao ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Descrição</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={ministry.description ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {state?.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
