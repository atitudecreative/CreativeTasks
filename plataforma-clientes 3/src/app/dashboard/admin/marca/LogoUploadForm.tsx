"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { uploadSiteLogo, resetSiteLogo } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar logo"}
    </button>
  );
}

export function LogoUploadForm({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const [state, formAction] = useFormState(uploadSiteLogo, { error: null as string | null });
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-sm font-medium text-neutral-700">Logo atual</p>
      <div className="mb-5 inline-flex rounded-xl bg-walnut-900 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização de arquivo dinâmico */}
        <img
          src={currentLogoUrl ?? "/logo-dark-bg.png"}
          alt="Logo atual"
          className="h-14 w-auto object-contain"
        />
      </div>

      <form action={formAction} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Nova logo (PNG, fundo transparente, até 2MB)
          </label>
          <input
            type="file"
            name="logo"
            accept="image/png"
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
            <div className="inline-flex rounded-xl bg-walnut-900 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL local, não passa pelo otimizador */}
              <img src={preview} alt="Pré-visualização" className="h-14 w-auto object-contain" />
            </div>
          </div>
        )}

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex items-center gap-3">
          <SubmitButton />
          {currentLogoUrl && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Voltar pra logo padrão (a.crtv.)?")) resetSiteLogo();
              }}
              className="text-sm text-neutral-500 hover:underline"
            >
              Restaurar logo padrão
            </button>
          )}
        </div>
      </form>

      <p className="mt-4 text-xs text-neutral-400">
        Tamanho ideal: PNG com fundo transparente, algo em torno de 600×160px (bem mais largo
        que alto, tipo um logotipo horizontal). Outras proporções também funcionam — a altura
        fica fixa no menu e na tela de login, e a largura se ajusta sozinha, sem distorcer.
      </p>
    </div>
  );
}
