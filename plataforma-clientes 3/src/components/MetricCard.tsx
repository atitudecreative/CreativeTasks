const ACCENT_CLASSES: Record<string, { border: string; text: string; bg: string }> = {
  brand: { border: "border-t-brand-500", text: "text-brand-700", bg: "bg-brand-50" },
  green: { border: "border-t-green-500", text: "text-green-700", bg: "bg-green-50" },
  red: { border: "border-t-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
  amber: { border: "border-t-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  // Segunda cor da identidade da plataforma (walnut) — usada no lugar de
  // tons genéricos (azul, violeta) em cards que não têm um significado
  // semântico próprio (alerta, sucesso etc.), pra ficar coerente com o
  // resto do portal.
  walnut: { border: "border-t-walnut-500", text: "text-walnut-700", bg: "bg-walnut-50" },
  violet: { border: "border-t-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
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
      className={`rounded-2xl border border-t-4 border-neutral-200 bg-white p-5 shadow-sm ${colors.border} ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
        {icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.text}`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
