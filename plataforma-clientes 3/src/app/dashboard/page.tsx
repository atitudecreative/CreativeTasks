import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import {
  getDemandsForMinistry,
  summarizeDemands,
  getMonthlyDemandStats,
  getStatusBreakdown,
  STATUS_LABEL,
} from "@/lib/data/demands";
import {
  getCampaignsForMinistry,
  getMilestonesForCampaign,
  calculateProgress,
  getSaudeBreakdown,
} from "@/lib/data/campaigns";
import { getDeliverablesForMinistry } from "@/lib/data/deliverables";
import { MetricCard } from "@/components/MetricCard";
import { DashboardCharts, ConclusionGauge } from "./DashboardCharts";

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

  // Progresso real por marcos (não decorativo) pras primeiras campanhas
  // ativas — é isso que vira a barra de progresso no lugar do
  // fase/saúde em texto puro.
  const campanhasComProgresso = await Promise.all(
    campanhasAtivas.slice(0, 4).map(async (c) => ({
      campaign: c,
      progresso: calculateProgress(await getMilestonesForCampaign(c.id)),
    }))
  );

  const monthlyStats = getMonthlyDemandStats(demands);
  const statusBreakdown = getStatusBreakdown(demands);
  const saudeBreakdown = getSaudeBreakdown(campaigns);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Início</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Situação geral de {ministry.name}.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Demandas ativas" value={resumo.abertas} accent="brand" />
        <MetricCard label="Concluídas" value={resumo.concluidas} accent="green" />
        <MetricCard label="Aguardando ministério" value={resumo.aguardandoMinisterio} accent="amber" />
        <MetricCard label="Campanhas ativas" value={campanhasAtivas.length} accent="violet" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-neutral-700">Taxa de conclusão</p>
          <ConclusionGauge total={resumo.total} concluidas={resumo.concluidas} />
          <p className="mt-2 text-xs text-neutral-400">
            {resumo.concluidas} de {resumo.total} demandas concluídas
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Campanhas ativas</h2>
            <Link href="/dashboard/campanhas" className="text-xs text-brand-600 hover:underline">
              ver todas
            </Link>
          </div>
          {campanhasComProgresso.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma campanha ativa no momento.</p>
          ) : (
            <ul className="space-y-4">
              {campanhasComProgresso.map(({ campaign, progresso }) => (
                <li key={campaign.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/campanhas/${campaign.id}`}
                      className="truncate text-sm font-medium text-neutral-800 hover:underline"
                    >
                      {campaign.nome}
                    </Link>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {progresso === null ? "sem marcos" : `${progresso}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${progresso ?? 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
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

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Entregas recentes</h2>
            <Link href="/dashboard/entregas" className="text-xs text-brand-600 hover:underline">
              ver todas
            </Link>
          </div>
          {entregasRecentes.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma entrega registrada ainda.</p>
          ) : (
            <ul className="space-y-3">
              {entregasRecentes.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="text-base">📎</span>
                  <div className="min-w-0">
                    {e.link_principal ? (
                      <a
                        href={e.link_principal}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-medium text-brand-600 hover:underline"
                      >
                        {e.titulo}
                      </a>
                    ) : (
                      <span className="truncate font-medium text-neutral-800">{e.titulo}</span>
                    )}
                    <p className="text-xs text-neutral-400">{formatDate(e.data_entrega)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DashboardCharts
        monthlyStats={monthlyStats}
        statusBreakdown={statusBreakdown}
        saudeBreakdown={saudeBreakdown}
      />
    </div>
  );
}
