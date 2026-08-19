"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateCampaignDetails, uploadCampaignCapa, removeCampaignCapa } from "./actions";
import { TIPO_OPTIONS, FASE_OPTIONS, SAUDE_OPTIONS } from "@/lib/campaignOptions";
import type { Campaign } from "@/lib/data/campaigns";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

function CapaBlock({ campaign }: { campaign: Campaign }) {
  const [state, formAction] = useFormState(uploadCampaignCapa, { error: null as string | null });
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-sm font-medium text-neutral-700">Capa da campanha</p>
      <p className="mb-4 text-xs text-neutral-500">
        Banner exibido no topo desta tela pra todo mundo que acessa a campanha.
      </p>

      <div
        className="relative mb-4 flex h-32 w-full max-w-sm items-center justify-center overflow-hidden rounded-xl bg-walnut-900 bg-cover bg-center"
        style={{ backgroundImage: `url(${preview ?? campaign.capa_url ?? ""})` }}
      >
        {!preview && !campaign.capa_url && (
          <span className="text-xs text-walnut-300">Sem capa — só o cabeçalho de texto</span>
        )}
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="campaignId" value={campaign.id} />
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Nova imagem (PNG, JPG ou WEBP, até 4MB)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            name="capa"
            accept="image/png,image/jpeg,image/webp"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
          />
        </div>
        <div className="flex items-center gap-3">
          <SaveButton label="Enviar capa" />
          {campaign.capa_url && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remover a capa de "${campaign.nome}"?`)) {
                  const fd = new FormData();
                  fd.set("campaignId", campaign.id);
                  removeCampaignCapa(fd);
                }
              }}
              className="text-xs text-rose-600 hover:underline"
            >
              Remover capa
            </button>
          )}
        </div>
        {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      </form>
    </div>
  );
}

function InfoForm({ campaign }: { campaign: Campaign }) {
  const [state, formAction] = useFormState(updateCampaignDetails, { error: null as string | null });

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={campaign.id} />
      <p className="mb-1 text-sm font-medium text-neutral-700">Editar informações</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
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
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {TIPO_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Fase</label>
          <select
            name="fase"
            defaultValue={campaign.fase}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {FASE_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Saúde</label>
          <select
            name="saude"
            defaultValue={campaign.saude}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {SAUDE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Início</label>
          <input
            type="date"
            name="data_inicio"
            defaultValue={campaign.data_inicio ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Término</label>
          <input
            type="date"
            name="data_termino"
            defaultValue={campaign.data_termino ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Data do evento</label>
          <input
            type="date"
            name="data_evento"
            defaultValue={campaign.data_evento ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Orçamento planejado (R$)</label>
          <input
            name="orcamento_planejado"
            type="number"
            step="0.01"
            defaultValue={campaign.orcamento_planejado ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Orçamento aprovado (R$)</label>
          <input
            name="orcamento_aprovado"
            type="number"
            step="0.01"
            defaultValue={campaign.orcamento_aprovado ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Investimento realizado (R$)</label>
          <input
            name="investimento_realizado"
            type="number"
            step="0.01"
            defaultValue={campaign.investimento_realizado ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Objetivo estratégico</label>
          <textarea
            name="objetivo_estrategico"
            rows={2}
            defaultValue={campaign.objetivo_estrategico ?? ""}
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Escopo macro</label>
          <textarea
            name="escopo_macro"
            rows={2}
            defaultValue={campaign.escopo_macro ?? ""}
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Resultados e observações</label>
          <textarea
            name="resultados_observacoes"
            rows={2}
            defaultValue={campaign.resultados_observacoes ?? ""}
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <SaveButton label="Salvar alterações" />
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
    </form>
  );
}

export function EditCampaignForm({ campaign }: { campaign: Campaign }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <CapaBlock campaign={campaign} />

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Editar informações da campanha
        </button>
      ) : (
        <div className="space-y-2">
          <InfoForm campaign={campaign} />
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-400 hover:underline">
            fechar edição
          </button>
        </div>
      )}
    </div>
  );
}
