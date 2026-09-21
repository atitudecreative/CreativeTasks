"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateMinistryTheme, resetMinistryTheme } from "./actions";
import { BRAND_SHADES, WALNUT_SHADES, generateScale, isValidHex, isLowSaturation } from "@/lib/theme";

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
      <label className="mb-1 block text-xs font-medium text-ink-2">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-control border border-line-strong bg-surface p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#f3701c"
          className={`w-32 rounded-control border px-3 py-2 text-sm outline-none focus:ring-1 ${
            valid
              ? "border-line-strong focus:border-brand-500 focus:ring-brand-500"
              : "border-danger-line focus:border-danger focus:shadow-focus focus:outline-none"
          }`}
        />
      </div>
      {!valid && <p className="mt-1 text-xs text-danger">Formato inválido — use #rrggbb.</p>}
      {valid && isLowSaturation(value) && (
        <p className="mt-1 text-xs text-warning">
          Cor com pouca saturação (quase cinza) — a paleta ainda fica legível, mas pode parecer
          &quot;sem graça&quot;.
        </p>
      )}
    </div>
  );
}

function SwatchRow({ scale, shades }: { scale: Record<string, string>; shades: readonly string[] }) {
  return (
    <div className="flex overflow-hidden rounded-control border border-line">
      {shades.map((shade) => (
        <div key={shade} className="flex-1 py-3 text-center" style={{ backgroundColor: scale[shade] }}>
          <span
            className="text-[0.625rem] font-medium"
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
      className="rounded-control bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar cores do ministério"}
    </button>
  );
}

export function MinistryThemeForm({
  ministryId,
  initialBrand,
  initialWalnut,
  siteBrand,
  siteWalnut,
  hasCustom,
}: {
  ministryId: string;
  initialBrand: string;
  initialWalnut: string;
  siteBrand: string;
  siteWalnut: string;
  hasCustom: boolean;
}) {
  const [brandColor, setBrandColor] = useState(initialBrand);
  const [walnutColor, setWalnutColor] = useState(initialWalnut);
  const [state, formAction] = useFormState(updateMinistryTheme, { error: null as string | null });

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
      <form action={formAction} className="rounded-panel border border-line bg-surface p-5 shadow-sm">
        <p className="mb-1 text-sm font-medium text-ink-2">Aparência do ministério</p>
        <p className="mb-4 text-xs text-ink-2">
          Cor principal e secundária usadas na sessão de quem tem esse ministério como ativo
          (menu, botões, badges, gráficos). Sem cor própria, vale o padrão do site.
        </p>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorPicker label="Cor principal (botões, links, destaques)" value={brandColor} onChange={setBrandColor} />
          <ColorPicker label="Cor secundária (menu lateral, blocos escuros)" value={walnutColor} onChange={setWalnutColor} />
        </div>

        <input type="hidden" name="ministryId" value={ministryId} />
        <input type="hidden" name="brandColor" value={brandColor} />
        <input type="hidden" name="walnutColor" value={walnutColor} />

        {state?.error && <p className="mb-3 text-sm text-danger">{state.error}</p>}

        <div className="flex items-center gap-3">
          <SubmitButton />
          {hasCustom && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Voltar a usar a cor padrão do site pra esse ministério?")) {
                  setBrandColor(siteBrand);
                  setWalnutColor(siteWalnut);
                  const fd = new FormData();
                  fd.set("ministryId", ministryId);
                  resetMinistryTheme(fd);
                }
              }}
              className="text-sm text-ink-2 hover:underline"
            >
              Usar cor padrão do site
            </button>
          )}
        </div>
      </form>

      <div className="rounded-panel border border-line bg-surface p-5 shadow-sm">
        <p className="mb-1 text-sm font-medium text-ink-2">Pré-visualização</p>
        <p className="mb-4 text-xs text-ink-3">
          A tonalidade clara (50) e a escura (900) são sempre calculadas automaticamente pra
          manter contraste e leitura, mesmo que a cor escolhida seja bem clara ou bem escura —
          só o matiz da cor vem da sua escolha.
        </p>

        {brandScale && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-ink-2">Principal</p>
            <SwatchRow scale={brandScale} shades={BRAND_SHADES} />
          </div>
        )}
        {walnutScale && (
          <div className="mb-5">
            <p className="mb-1.5 text-xs font-medium text-ink-2">Secundária</p>
            <SwatchRow scale={walnutScale} shades={WALNUT_SHADES} />
          </div>
        )}

        {brandScale && walnutScale && (
          <div className="rounded-card p-5" style={{ backgroundColor: walnutScale["900"] }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: walnutScale["300"] }}>
              Exemplo de menu
            </p>
            <div
              className="mb-2 rounded-control px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: brandScale["600"] }}
            >
              Item ativo
            </div>
            <div className="mb-4 rounded-control px-3 py-2 text-sm font-medium" style={{ color: walnutScale["200"] }}>
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
