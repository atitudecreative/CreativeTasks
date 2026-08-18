import Link from "next/link";
import { requireMinistry } from "@/lib/data/ministries";
import {
  getDemandsForMinistry,
  summarizeDemands,
  getMonthlyDemandStats,
  getStatusBreakdown,
  STATUS_LABEL,
} from "@/lib/data/demands";
import { getCampaignsForMinistry, getSaudeBreakdown } from "@/lib/data/campaigns";
import { getDeliverablesForMinistry } from "@/lib/data/deliverables";
import {
  ChartCard,
  DemandasPorMesChart,
  StatusPieChart,
  SaudePieChart,
} from "./DashboardCharts";

const TIMEZONE = "America/Sao_Paulo";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem prazo";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

// Saudação com base no horário de Brasília (não no fuso do servidor, que
// no Render roda em UTC): 06h–12h Bom dia, 12h–18h Boa tarde, do
// contrário Boa noite.
function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", hour12: false }).format(new Date())
  );
  if (hour >= 6 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getTodayLabel() {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const CHIP_ACCENT: Record<string, string> = {
  brand: "text-brand-600",
  green: "text-emerald-600",
  amber: "text-amber-600",
  violet: "text-violet-600",
};

function MetricChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: keyof typeof CHIP_ACCENT;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-5 text-center shadow-sm">
      <span className={`text-4xl font-bold ${CHIP_ACCENT[accent]}`}>{value}</span>
      <span className="mt-1 text-xs text-neutral-400">{label}</span>
    </div>
  );
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
      <div className="mb-8">
        <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">{getTodayLabel()}</p>
        <h1 className="mb-5 text-4xl font-bold text-walnut-700">
          {getGreeting()}, {ministry.name}
        </h1>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricChip label="Demandas ativas" value={resumo.abertas} accent="brand" />
          <MetricChip label="Concluídas" value={resumo.concluidas} accent="green" />
          <MetricChip label="Aguardando ministério" value={resumo.aguardandoMinisterio} accent="amber" />
          <MetricChip label="Campanhas ativas" value={campanhasAtivas.length} accent="violet" />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Demandas por mês (2026 em diante)">
            <DemandasPorMesChart data={monthlyStats} />
          </ChartCard>
        </div>
        <ChartCard title="Demandas por status">
          <StatusPieChart data={statusBreakdown} />
        </ChartCard>
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

      <ChartCard title="Campanhas por saúde">
        <SaudePieChart data={saudeBreakdown} />
      </ChartCard>
    </div>
  );
}
