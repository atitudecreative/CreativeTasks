import { Delta, Icon, Tooltip, cn } from "@/components/ui";
import { Contador, type FormatoContador } from "./Contador";

/* =========================================================================
   KPI DA HOME
   -------------------------------------------------------------------------
   Um cartão por pergunta: quanto foi investido, quantas pessoas viram,
   quantos resultados, a que custo. Anatomia fixa, de cima para baixo:

     ícone + nome ........................ o que é (com explicação no ⓘ)
     VALOR ............................... o número, em destaque
     ↗ +12,4% vs. 3 meses anteriores ..... para onde foi, e contra o quê
     antes: R$ 21,8 mil .................. o número de comparação, explícito
     ▁▂▃▅▆▇ .............................. o formato da semana a semana

   COR COM SIGNIFICADO. Cada indicador tem uma cor fixa — a mesma no ícone
   do cartão, na sparkline e na série do gráfico principal quando ele
   mostra essa métrica. O texto nunca usa a cor da série: fica em tinta,
   para o contraste valer nos dois temas. Verde e vermelho ficam
   reservados para a direção da variação, e o vermelho só aparece quando
   a variação é ruim (custo subindo, resultado caindo).
   ========================================================================= */

export type CorKpi = "investimento" | "alcance" | "resultados" | "custo" | "impressoes" | "cliques" | "ctr";

/** Variável CSS da cor de cada indicador — slots da paleta categórica já
 *  validada do design system (ver README, "Visualização de dados"). */
export const COR_KPI: Record<CorKpi, string> = {
  investimento: "--chart-2", // laranja: dinheiro saindo
  alcance: "--chart-1", // azul: informação, gente alcançada
  impressoes: "--chart-1",
  resultados: "--chart-7", // violeta: conversão
  custo: "--chart-3", // água: eficiência
  cliques: "--chart-5",
  ctr: "--chart-5",
};

/* Sparkline: série semanal minúscula. Semana sem dado é lacuna no traço,
   nunca um mergulho até o zero. */
export function Sparkline({ valores, cor, className }: { valores: (number | null)[]; cor: string; className?: string }) {
  const presentes = valores.filter((v): v is number => v != null);
  if (presentes.length < 2) return null;

  const L = 120;
  const A = 32;
  const min = Math.min(...presentes);
  const max = Math.max(...presentes);
  const span = max - min || 1;
  const x = (i: number) => (valores.length === 1 ? L : (i / (valores.length - 1)) * L);
  const y = (v: number) => A - 3 - ((v - min) / span) * (A - 8);

  // Um traço por trecho contínuo.
  const trechos: { i: number; v: number }[][] = [];
  let atual: { i: number; v: number }[] = [];
  valores.forEach((v, i) => {
    if (v == null) {
      if (atual.length) trechos.push(atual);
      atual = [];
    } else atual.push({ i, v });
  });
  if (atual.length) trechos.push(atual);

  const linha = (t: { i: number; v: number }[]) =>
    t.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = (t: { i: number; v: number }[]) =>
    `${linha(t)} L${x(t[t.length - 1].i).toFixed(1)},${A} L${x(t[0].i).toFixed(1)},${A} Z`;

  const ultimoIdx = valores.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop()!;
  const cx = x(ultimoIdx);
  const cy = y(valores[ultimoIdx]!);
  const stroke = `rgb(var(${cor}))`;

  return (
    <div className={cn("relative h-8 w-full", className)} aria-hidden="true">
      <svg viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        {trechos.map((t, k) => (
          <g key={k}>
            {t.length > 1 && <path d={area(t)} fill={stroke} opacity={0.1} />}
            <path
              d={linha(t)}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      {/* O ponto da semana mais recente fica FORA do SVG: o SVG estica na
          horizontal (preserveAspectRatio="none") e um <circle> dentro dele
          viraria uma elipse achatada no celular. Em HTML ele é sempre um
          círculo, com o anel na cor da superfície. */}
      <span
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
        style={{ left: `${(cx / L) * 100}%`, top: `${(cy / A) * 100}%`, backgroundColor: stroke }}
      />
    </div>
  );
}

export function KpiCard({
  rotulo,
  ajuda,
  icone,
  cor,
  valor,
  formato,
  vazio,
  delta,
  deltaInverso,
  deltaNeutro,
  deltaRotulo,
  semComparacao,
  anterior,
  contexto,
  serie,
  className,
}: {
  className?: string;
  rotulo: string;
  ajuda?: string;
  icone: React.ReactNode;
  cor: CorKpi;
  valor: number | null;
  formato: FormatoContador;
  /** Frase no lugar do número quando ele não existe ("sem conversão
   *  rastreada") — diferente de zero, e a tela precisa dizer. */
  vazio: string;
  delta?: number | null;
  deltaInverso?: boolean;
  deltaNeutro?: boolean;
  deltaRotulo?: string;
  /** Por que não há seta ("sem campanha no período anterior"). */
  semComparacao?: string;
  /** Valor do período anterior, já formatado. */
  anterior?: string | null;
  /** De onde vem o número ("em 6 de 9 campanhas"). */
  contexto?: string;
  serie?: (number | null)[];
}) {
  const v = COR_KPI[cor];
  return (
    <div
      data-print-block=""
      className={cn(
        "flex min-w-0 flex-col rounded-panel border border-line bg-surface p-4 shadow-xs sm:p-5",
        "transition-[border-color,box-shadow] duration-180 ease-snap hover:border-line-strong hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control"
          style={{ backgroundColor: `rgb(var(${v}) / 0.12)`, color: `rgb(var(${v}))` }}
        >
          {icone}
        </span>
        <p className="min-w-0 flex-1 truncate text-small font-medium text-ink-2">{rotulo}</p>
        {ajuda && (
          <Tooltip content={ajuda}>
            <button
              type="button"
              aria-label={`O que é ${rotulo.toLowerCase()}: ${ajuda}`}
              className="-m-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink-2"
            >
              <Icon.Info className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}
      </div>

      <p
        className={cn(
          "mt-4 whitespace-nowrap text-[1.75rem] font-semibold leading-none tracking-[-0.02em] sm:text-[2rem]",
          valor != null ? "text-ink" : "text-ink-3"
        )}
      >
        {valor != null ? <Contador valor={valor} formato={formato} /> : <span aria-label={vazio}>—</span>}
      </p>

      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption text-ink-3">
        {valor == null ? (
          <span>{vazio}</span>
        ) : delta != null ? (
          <>
            <Delta value={delta} invert={deltaInverso} neutral={deltaNeutro} />
            <span>{deltaRotulo}</span>
          </>
        ) : (
          <span>{semComparacao ?? "sem base para comparar"}</span>
        )}
      </div>

      <div className="mt-auto pt-4">
        {serie && valor != null ? <Sparkline valores={serie} cor={v} /> : <div className="h-8" aria-hidden="true" />}
        <p className="mt-2.5 truncate border-t border-line pt-2.5 text-[0.6875rem] text-ink-3">
          {/* "Antes" primeiro: se a linha não couber, corta o contexto, que é
              o menos importante dos dois. */}
          {anterior != null && (
            <>
              Antes: <span className="font-medium tabular-nums text-ink-2">{anterior}</span>
              {contexto ? " · " : ""}
            </>
          )}
          {contexto ?? (anterior == null ? "\u00a0" : "")}
        </p>
      </div>
    </div>
  );
}
