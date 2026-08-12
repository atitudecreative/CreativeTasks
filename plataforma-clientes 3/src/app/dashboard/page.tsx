import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import {
  getDemandsForMinistry,
  summarizeDemands,
  getMonthlyDemandStats,
  getStatusBreakdown,
  STATUS_LABEL,
} from "@/lib/data/demands";
import { getCampaignsForMinistry, FASE_LABEL, SAUDE_LABEL, getSaudeBreakdown } from "@/lib/data/campaigns";
import { getDeliverablesForMinistry } from "@/lib/data/deliverables";
import { MetricCard } from "@/components/MetricCard";
import { DashboardCharts } from "./DashboardCharts";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem prazo";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function DashboardPage() {
  const { ministry } = await requireMinistry();

  const [demands, campaigns, deliverables] = await Promise.all([
    getDemandsForMinistry(ministry.id),
    getCampaignsForMinistry(ministry.id),
    getDeliverablesForMinistry(ministry.id),
  ]);

  const resumo = summarizeDemands(demands);
  const campanhasAtivas = campaigns.filter((c) => c.saude !== "concluida");
  const proximasEntregas = demands
    .filter((d) => d.prazo_acordado && d.status !== "concluida" && d.status !== "cancelada")
    .slice(0, 5);
  const entregasRecentes = deliverables.slice(0, 5);

  const monthlyStats = getMonthlyDemandStats(demands);
  const statusBreakdown = getStatusBreakdown(demands);
  const saudeBreakdown = getSaudeBreakdown(campaigns);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Início</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Situação geral de {ministry.name}.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Demandas ativas" value={resumo.abertas} accent="brand" />
        <MetricCard label="Concluídas" value={resumo.concluidas} accent="green" />
        <MetricCard label="Atrasadas" value={resumo.atrasadas} accent="red" />
        <MetricCard label="Aguardando ministério" value={resumo.aguardandoMinisterio} accent="amber" />
        <MetricCard label="Aguardando aprovação" value={resumo.aguardandoAprovacao} accent="sky" />
        <MetricCard label="Campanhas ativas" value={campanhasAtivas.length} accent="violet" />
      </div>

      <DashboardCharts
        monthlyStats={monthlyStats}
        statusBreakdown={statusBreakdown}
        saudeBreakdown={saudeBreakdown}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Campanhas ativas</h2>
            <Link href="/dashboard/campanhas" className="text-xs text-brand-600 hover:underline">
              ver todas
            </Link>
          </div>
          {campanhasAtivas.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma campanha ativa no momento.</p>
          ) : (
            <ul className="space-y-3">
              {campanhasAtivas.slice(0, 5).map((c) => (
                <li key={c.id} className="text-sm">
                  <Link href={`/dashboard/campanhas/${c.id}`} className="font-medium text-neutral-800 hover:underline">
                    {c.nome}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    {FASE_LABEL[c.fase] ?? c.fase} · {SAUDE_LABEL[c.saude] ?? c.saude}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Próximas entregas e prazos</h2>
            <Link href="/dashboard/demandas" className="text-xs text-brand-600 hover:underline">
              ver todas
            </Link>
          </div>
          {proximasEntregas.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum prazo em aberto.</p>
          ) : (
            <ul className="space-y-3">
              {proximasEntregas.map((d) => (
                <li key={d.id} className="text-sm">
                  <Link href={`/dashboard/demandas/${d.id}`} className="font-medium text-neutral-800 hover:underline">
                    {d.titulo}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    {STATUS_LABEL[d.status] ?? d.status} · prazo {formatDate(d.prazo_acordado)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Entregas recentes</h2>
            <Link href="/dashboard/entregas" className="text-xs text-brand-600 hover:underline">
              ver todas
            </Link>
          </div>
          {entregasRecentes.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma entrega registrada ainda.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {entregasRecentes.map((e) => (
                <li key={e.id} className="text-sm">
                  {e.link_principal ? (
                    <a href={e.link_principal} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
                      {e.titulo}
                    </a>
                  ) : (
                    <span className="font-medium text-neutral-800">{e.titulo}</span>
                  )}
                  <p className="text-xs text-neutral-400">{formatDate(e.data_entrega)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
