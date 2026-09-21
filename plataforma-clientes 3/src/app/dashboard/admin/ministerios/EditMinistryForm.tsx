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
      className="rounded-control bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

export function EditMinistryForm({ ministry }: { ministry: EditableMinistry }) {
  const [state, formAction] = useFormState(updateMinistry, { error: null as string | null });

  return (
    <form action={formAction} className="rounded-panel border border-line bg-surface p-5 shadow-sm">
      <input type="hidden" name="id" value={ministry.id} />

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Nome *</label>
          <input
            name="name"
            required
            defaultValue={ministry.name}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Sigla</label>
          <input
            name="sigla"
            defaultValue={ministry.sigla ?? ""}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Categoria</label>
          <select
            name="categoria"
            defaultValue={ministry.categoria}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          >
            {CATEGORIA_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Status</label>
          <select
            name="status"
            defaultValue={ministry.status}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          >
            {MINISTRY_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Pastor responsável</label>
          <input
            name="pastorResponsavel"
            defaultValue={ministry.pastor_responsavel ?? ""}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Centro de custo</label>
          <input
            name="centroCusto"
            defaultValue={ministry.centro_custo ?? ""}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Ponto focal do ministério</label>
          <input
            name="pontoFocalMinisterio"
            defaultValue={ministry.ponto_focal_ministerio ?? ""}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Ponto focal da Comunicação</label>
          <input
            name="pontoFocalComunicacao"
            defaultValue={ministry.ponto_focal_comunicacao ?? ""}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink-2">Descrição</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={ministry.description ?? ""}
            className="w-full rounded-control border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:shadow-focus focus:outline-none"
          />
        </div>
      </div>

      {state?.error && <p className="mb-3 text-sm text-danger">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
