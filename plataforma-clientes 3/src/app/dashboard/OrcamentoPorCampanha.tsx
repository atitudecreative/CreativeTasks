import Link from "next/link";
import { EmptyState, Icon, cn } from "@/components/ui";
import { formatMoney } from "@/lib/metricLanguage";

/* =========================================================================
   ORÇAMENTO × REALIZADO, POR CAMPANHA
   -------------------------------------------------------------------------
   Substitui o gráfico de três barras "Planejado / Aprovado / Investido".
   Aquele gráfico somava cada barra sobre um conjunto DIFERENTE de
   campanhas: o planejado só das que tinham planejado, o investido de
   todas. Com uma campanha de R$ 1,3 mi sem orçamento cadastrado, as duas
   primeiras barras viravam um risco no chão e a leitura era "gastamos
   trinta vezes o previsto" — falso.

   Aqui só entra campanha que tem as duas pontas (orçamento e realizado), e
   cada uma é lida contra o PRÓPRIO orçamento. O total no topo soma o mesmo
   conjunto dos dois lados.
   ========================================================================= */

export type LinhaOrcamento = {
  id: string;
  nome: string;
  orcamento: number;
  /** "aprovado" quando existe; senão o planejado, e a linha diz isso. */
  base: "aprovado" | "planejado";
  realizado: number;
};

const LIMITE = 6;

export function OrcamentoPorCampanha({ linhas, semOrcamento }: { linhas: LinhaOrcamento[]; semOrcamento: number }) {
  if (linhas.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Icon.Wallet className="h-4 w-4" />}
        title="Nenhuma campanha com orçamento e gasto lançados"
        description="Quando uma campanha tiver o orçamento aprovado e o investimento registrados, a comparação aparece aqui."
      />
    );
  }

  const orcamentoTotal = linhas.reduce((t, l) => t + l.orcamento, 0);
  const realizadoTotal = linhas.reduce((t, l) => t + l.realizado, 0);
  const pctTotal = orcamentoTotal > 0 ? (realizadoTotal / orcamentoTotal) * 100 : 0;

  // Quem estourou vem primeiro: é a linha que pede explicação.
  const ordenadas = [...linhas].sort((a, b) => b.realizado / b.orcamento - a.realizado / a.orcamento);

  return (
    <div>
      <p className="text-small text-ink-2">
        <span className="font-medium tabular-nums text-ink">{formatMoney(realizadoTotal, true)}</span> usados de{" "}
        <span className="tabular-nums">{formatMoney(orcamentoTotal, true)}</span> previstos
        <span className="text-ink-3"> · {Math.round(pctTotal)}%</span>
      </p>
      <p className="mt-0.5 text-caption text-ink-3">
        {linhas.length} {linhas.length === 1 ? "campanha" : "campanhas"} com orçamento e gasto lançados
        {semOrcamento > 0 && ` · ${semOrcamento} sem orçamento cadastrado não entram na conta`}
      </p>

      <ul className="mt-4 space-y-3.5">
        {ordenadas.slice(0, LIMITE).map((l) => {
          const pct = (l.realizado / l.orcamento) * 100;
          const estourou = pct > 105;
          return (
            <li key={l.id}>
              <Link href={`/dashboard/campanhas/${l.id}`} className="group block rounded-control focus-visible:outline-offset-4">
                <span className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-small text-ink transition-colors group-hover:text-brand-600">
                    {l.nome}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-caption font-medium tabular-nums",
                      estourou ? "text-warning" : "text-ink"
                    )}
                  >
                    {Math.round(pct)}%
                  </span>
                </span>
                {/* Trilho = orçamento. A marca vertical é o 100%: quando o
                    realizado passa dela, a barra chega ao fim e muda de cor. */}
                <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
                  <span
                    className={cn(
                      "block h-full origin-left rounded-full animate-bar-grow",
                      estourou ? "bg-warning" : "bg-brand-600"
                    )}
                    style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                  />
                </span>
                <span className="mt-1 block text-caption text-ink-3 tabular-nums">
                  {formatMoney(l.realizado, true)} de {formatMoney(l.orcamento, true)}{" "}
                  {l.base === "planejado" ? "planejados" : "aprovados"}
                  {estourou && <span className="text-warning"> · {Math.round(pct - 100)}% acima</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {ordenadas.length > LIMITE && (
        <p className="mt-3 text-caption text-ink-3">
          +{ordenadas.length - LIMITE} {ordenadas.length - LIMITE === 1 ? "campanha" : "campanhas"} em{" "}
          <Link href="/dashboard/campanhas" className="text-brand-600 hover:underline">
            Campanhas e eventos
          </Link>
        </p>
      )}
    </div>
  );
}
