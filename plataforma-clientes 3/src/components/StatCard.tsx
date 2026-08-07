const SOURCE_LABEL: Record<string, string> = {
  asana: "Asana",
  meta_ads: "Meta Ads",
  e_inscricao: "e-inscrição",
};

export function StatCard({
  label,
  value,
  source,
}: {
  label: string;
  value: number;
  source: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{label}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
          {SOURCE_LABEL[source] ?? source}
        </span>
      </div>
      <p className="text-2xl font-semibold text-neutral-900">
        {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}
      </p>
    </div>
  );
}
