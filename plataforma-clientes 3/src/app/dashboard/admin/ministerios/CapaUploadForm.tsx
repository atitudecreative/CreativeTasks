"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { uploadMinistryCapa, removeMinistryCapa } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar capa"}
    </button>
  );
}

export function CapaUploadForm({
  ministryId,
  ministryName,
  currentCapaUrl,
}: {
  ministryId: string;
  ministryName: string;
  currentCapaUrl: string | null;
}) {
  const [state, formAction] = useFormState(uploadMinistryCapa, { error: null as string | null });
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-sm font-medium text-neutral-700">Capa do ministério</p>
      <p className="mb-4 text-xs text-neutral-500">
        Fundo do menu lateral pra quem está com "{ministryName}" como ministério ativo. Vale pra
        todo mundo vinculado a esse ministério — não é pessoal.
      </p>

      <div
        className="relative mb-4 flex h-32 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl bg-walnut-900 bg-cover bg-center"
        style={currentCapaUrl ? { backgroundImage: `url(${currentCapaUrl})` } : undefined}
      >
        {!currentCapaUrl && <span className="text-xs text-walnut-300">Sem capa — usando cor sólida</span>}
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="ministryId" value={ministryId} />
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Nova imagem (PNG, JPG ou WEBP, até 4MB)
          </label>
          <input
            type="file"
            name="capa"
            accept="image/png,image/jpeg,image/webp"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
        </div>

        {preview && (
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-500">Pré-visualização</p>
            <div
              className="h-32 w-full max-w-xs rounded-xl bg-walnut-900 bg-cover bg-center"
              style={{ backgroundImage: `url(${preview})` }}
            />
          </div>
        )}

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex items-center gap-3">
          <SubmitButton />
          {currentCapaUrl && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remover a capa de "${ministryName}"? Volta pra cor sólida.`)) {
                  const fd = new FormData();
                  fd.set("ministryId", ministryId);
                  removeMinistryCapa(fd);
                }
              }}
              className="text-sm text-neutral-500 hover:underline"
            >
              Remover capa
            </button>
          )}
        </div>
      </form>

      <p className="mt-4 text-xs text-neutral-400">
        Tamanho ideal: algo em torno de 1200×800px (retrato do ministério, foto de um evento,
        textura etc.), na horizontal. A imagem é cortada pra preencher o menu lateral (efeito
        "cover") e recebe uma camada escura por cima pra manter o texto legível.
      </p>
    </div>
  );
}
