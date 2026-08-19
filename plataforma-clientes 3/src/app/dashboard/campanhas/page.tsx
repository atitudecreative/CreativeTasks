import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import { getCampaignsForMinistry, FASE_LABEL, SAUDE_LABEL } from "@/lib/data/campaigns";

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SAUDE_BADGE: Record<string, string> = {
  no_caminho: "bg-green-50 text-green-700",
  atencao: "bg-amber-50 text-amber-700",
  critica: "bg-red-50 text-red-700",
  pausada: "bg-neutral-100 text-neutral-600",
  concluida: "bg-brand-50 text-brand-700",
};

export default async function CampanhasPage() {
  const { ministry } = await requireMinistry();

  const campaigns = await getCampaignsForMinistry(ministry.id);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Campanhas e eventos</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Iniciativas da Comunicação para {ministry.name}.
      </p>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma campanha ou evento cadastrado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/campanhas/${c.id}`}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm hover:border-neutral-300"
            >
              {c.capa_url && (
                <div
                  className="aspect-video w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${c.capa_url})` }}
                />
              )}
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium text-neutral-800">{c.nome}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${SAUDE_BADGE[c.saude] ?? "bg-neutral-100 text-neutral-600"}`}>
                    {SAUDE_LABEL[c.saude] ?? c.saude}
                  </span>
                </div>
                <p className="mb-3 text-xs text-neutral-400">{FASE_LABEL[c.fase] ?? c.fase}</p>
                <p className="text-xs text-neutral-500">
                  Orçamento aprovado: {formatMoney(c.orcamento_aprovado)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
