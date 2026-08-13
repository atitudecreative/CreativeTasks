"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateSiteTheme, resetSiteTheme } from "./actions";
import {
  BRAND_SHADES,
  WALNUT_SHADES,
  generateScale,
  isValidHex,
  isLowSaturation,
  DEFAULT_BRAND_COLOR,
  DEFAULT_WALNUT_COLOR,
} from "@/lib/theme";

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const valid = isValidHex(value);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#f3701c"
          className={`w-32 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${
            valid
              ? "border-neutral-300 focus:border-brand-500 focus:ring-brand-500"
              : "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
          }`}
        />
      </div>
      {!valid && <p className="mt-1 text-xs text-rose-600">Formato inválido — use #rrggbb.</p>}
      {valid && isLowSaturation(value) && (
        <p className="mt-1 text-xs text-amber-600">
          Cor com pouca saturação (quase cinza) — a paleta ainda fica legível, mas pode parecer
          "sem graça".
        </p>
      )}
    </div>
  );
}

function SwatchRow({ scale, shades }: { scale: Record<string, string>; shades: readonly string[] }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-neutral-200">
      {shades.map((shade) => (
        <div key={shade} className="flex-1 py-3 text-center" style={{ backgroundColor: scale[shade] }}>
          <span
            className="text-[10px] font-medium"
            style={{ color: Number(shade) >= 500 ? "#fff" : "#1c1917" }}
          >
            {shade}
          </span>
        </div>
      ))}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar cores"}
    </button>
  );
}

export function ThemeSettingsForm({
  initialBrand,
  initialWalnut,
}: {
  initialBrand: string;
  initialWalnut: string;
}) {
  const [brandColor, setBrandColor] = useState(initialBrand);
  const [walnutColor, setWalnutColor] = useState(initialWalnut);
  const [state, formAction] = useFormState(updateSiteTheme, { error: null as string | null });

  const brandScale = useMemo(
    () => (isValidHex(brandColor) ? generateScale(brandColor, BRAND_SHADES) : null),
    [brandColor]
  );
  const walnutScale = useMemo(
    () => (isValidHex(walnutColor) ? generateScale(walnutColor, WALNUT_SHADES) : null),
    [walnutColor]
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-medium text-neutral-700">Cores do site</p>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorPicker label="Cor principal (botões, links, destaques)" value={brandColor} onChange={setBrandColor} />
          <ColorPicker label="Cor secundária (menu lateral, blocos escuros)" value={walnutColor} onChange={setWalnutColor} />
        </div>

        <input type="hidden" name="brandColor" value={brandColor} />
        <input type="hidden" name="walnutColor" value={walnutColor} />

        {state?.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}

        <div className="flex items-center gap-3">
          <SubmitButton />
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Restaurar as cores originais (laranja/marrom)?")) {
                setBrandColor(DEFAULT_BRAND_COLOR);
                setWalnutColor(DEFAULT_WALNUT_COLOR);
                resetSiteTheme();
              }
            }}
            className="text-sm text-neutral-500 hover:underline"
          >
            Restaurar padrão
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="mb-1 text-sm font-medium text-neutral-700">Pré-visualização</p>
        <p className="mb-4 text-xs text-neutral-400">
          A tonalidade clara (50) e a escura (900) são sempre calculadas automaticamente pra
          manter contraste e leitura, mesmo que a cor escolhida seja bem clara ou bem escura —
          só o matiz da cor vem da sua escolha.
        </p>

        {brandScale && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Principal</p>
            <SwatchRow scale={brandScale} shades={BRAND_SHADES} />
          </div>
        )}
        {walnutScale && (
          <div className="mb-5">
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Secundária</p>
            <SwatchRow scale={walnutScale} shades={WALNUT_SHADES} />
          </div>
        )}

        {brandScale && walnutScale && (
          <div className="rounded-xl p-5" style={{ backgroundColor: walnutScale["900"] }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: walnutScale["300"] }}>
              Exemplo de menu
            </p>
            <div
              className="mb-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: brandScale["600"] }}
            >
              Item ativo
            </div>
            <div className="mb-4 rounded-lg px-3 py-2 text-sm font-medium" style={{ color: walnutScale["200"] }}>
              Item inativo
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: brandScale["600"] }}
              >
                Botão principal
              </span>
              <span
                className="rounded-full px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: brandScale["50"], color: brandScale["700"] }}
              >
                Badge/etiqueta
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
