const ACCENT_CLASSES: Record<string, { border: string; text: string; bg: string }> = {
  brand: { border: "border-t-brand-500", text: "text-brand-700", bg: "bg-brand-50" },
  green: { border: "border-t-green-500", text: "text-green-700", bg: "bg-green-50" },
  red: { border: "border-t-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
  amber: { border: "border-t-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  sky: { border: "border-t-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
  violet: { border: "border-t-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
};

export function MetricCard({
  label,
  value,
  hint,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: keyof typeof ACCENT_CLASSES;
}) {
  const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.brand;

  return (
    <div className={`rounded-2xl border border-t-4 border-neutral-200 bg-white p-5 shadow-sm ${colors.border}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
