import { Skeleton } from "@/components/ui";

/* Esqueleto com a forma REAL da Home, bloco a bloco: cabeçalho e filtro,
   quatro KPIs (com a sparkline), a faixa de apoio, o gráfico grande,
   público e produção, campanhas e insights. Um esqueleto genérico mostra
   uma forma e entrega outra — a página "pula" na troca e o ganho de tempo
   percebido se perde. */

function Caixa({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-panel border border-line bg-surface p-4 shadow-xs sm:p-5 ${className ?? ""}`}>{children}</div>;
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando o painel">
      {/* Cabeçalho + filtro */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <Skeleton className="hidden h-12 w-12 rounded-full sm:block" />
          <div>
            <Skeleton className="mb-2 h-4 w-40" />
            <Skeleton className="mb-2 h-8 w-80 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-72 max-w-full rounded-control" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Caixa key={i}>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-control" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="mt-4 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
            <Skeleton className="mt-4 h-8 w-full" />
            <Skeleton className="mt-3 h-3 w-24" />
          </Caixa>
        ))}
      </div>
      <Skeleton className="mt-4 h-[84px] w-full rounded-panel" />

      {/* Gráfico principal */}
      <Caixa className="mt-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-5 h-8 w-80 max-w-full rounded-control" />
        <Skeleton className="mt-5 h-[240px] w-full rounded-card sm:h-[300px]" />
      </Caixa>

      {/* Público e produção */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Caixa key={i}>
            <Skeleton className="h-4 w-40" />
            <div className="mt-5 space-y-3">
              {[80, 64, 92, 48].map((w, j) => (
                <Skeleton key={j} className="h-2.5" style={{ width: `${w}%` }} />
              ))}
            </div>
          </Caixa>
        ))}
      </div>

      {/* Campanhas e insights */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Caixa>
          <Skeleton className="h-4 w-56" />
          <div className="mt-4 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Caixa>
        <Caixa>
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </Caixa>
      </div>
      <div className="mt-section grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-panel" />
        ))}
      </div>
    </div>
  );
}
