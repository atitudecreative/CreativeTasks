const ACCENT_CLASSES: Record<string, { border: string; text: string; solid: string }> = {
  brand: { border: "border-t-brand-500", text: "text-brand-700", solid: "bg-brand-600" },
  green: { border: "border-t-green-500", text: "text-green-700", solid: "bg-green-600" },
  red: { border: "border-t-rose-500", text: "text-rose-700", solid: "bg-rose-600" },
  amber: { border: "border-t-amber-500", text: "text-amber-700", solid: "bg-amber-500" },
  // Segunda cor da identidade da plataforma (walnut) — usada no lugar de
  // tons genéricos (azul, violeta) em cards que não têm um significado
  // semântico próprio (alerta, sucesso etc.), pra ficar coerente com o
  // resto do portal.
  walnut: { border: "border-t-walnut-500", text: "text-walnut-700", solid: "bg-walnut-600" },
  violet: { border: "border-t-violet-500", text: "text-violet-700", solid: "bg-violet-600" },
};

export function MetricCard({
  label,
  value,
  hint,
  accent = "brand",
  icon,
  className = "",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: keyof typeof ACCENT_CLASSES;
  // Ícone opcional (svg de 16-18px) — mostrado num chip colorido no
  // canto superior direito do card. Sem isso, o card renderiza igual a
  // antes (compatível com todo uso já existente).
  icon?: React.ReactNode;
  // Classes extras pro container — usado, por exemplo, pra esticar o
  // card (h-full + flex) quando ele mora dentro de um grid com altura
  // definida por outro elemento (ex: ao lado do banner da campanha).
  className?: string;
}) {
  const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.brand;

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border border-t-4 border-neutral-200 bg-white p-4 shadow-sm ${colors.border} ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
        {icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${colors.solid}`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`break-words text-2xl font-bold leading-tight ${colors.text}`}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
