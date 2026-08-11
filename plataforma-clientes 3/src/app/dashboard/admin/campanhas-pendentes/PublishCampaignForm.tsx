"use client";

import { useFormState, useFormStatus } from "react-dom";
import { publishCampaign, dismissCampaign } from "./actions";
import type { PendingCampaign } from "@/lib/data/campaigns";

// Não importa TIPO_LABEL de @/lib/data/campaigns aqui de propósito: esse
// arquivo é "use client" e qualquer import de valor (não-tipo) vindo de um
// módulo que usa @/lib/supabase/server (next/headers) quebra o build —
// next/headers só pode ser referenciado em Server Components.
const TIPO_OPTIONS = [
  { value: "campanha", label: "Campanha" },
  { value: "evento", label: "Evento" },
  { value: "lancamento", label: "Lançamento" },
  { value: "serie", label: "Série" },
  { value: "acao_recorrente", label: "Ação recorrente" },
  { value: "projeto_institucional", label: "Projeto institucional" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Abrindo..." : "Abrir evento/campanha"}
    </button>
  );
}

export function PublishCampaignForm({ campaign }: { campaign: PendingCampaign }) {
  const [state, formAction] = useFormState(publishCampaign, { error: null as string | null });

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-neutral-400">{campaign.ministryName}</p>
          <p className="text-xs text-neutral-400">
            {campaign.origem === "asana_tag" ? "Detectado pela tag do Asana" : "Cadastro anterior"} ·{" "}
            {campaign.demandCount}{" "}
            {campaign.demandCount === 1 ? "demanda vinculada" : "demandas vinculadas"}
          </p>
        </div>
        <form
          action={dismissCampaign}
          onSubmit={(e) => {
            if (!window.confirm(`Excluir "${campaign.nome}" definitivamente? As demandas vinculadas ficam sem campanha.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={campaign.id} />
          <button
            type="submit"
            className="text-xs font-medium text-neutral-400 hover:text-red-600"
          >
            Excluir
          </button>
        </form>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={campaign.id} />

        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Nome</label>
          <input
            name="nome"
            defaultValue={campaign.nome}
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Tipo</label>
          <select
            name="tipo"
            defaultValue={campaign.tipo}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {TIPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <SubmitButton />
      </form>

      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
