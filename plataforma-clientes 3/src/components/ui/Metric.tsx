import { cn } from "./cn";
import { Delta } from "./Badge";

/* =========================================================================
   MÉTRICAS
   -------------------------------------------------------------------------
   Antes existiam TRÊS cards de KPI diferentes (StatCard, MetricCard,
   MetricChip), cada um numa tela, com visual próprio. Aqui há um
   componente com três densidades — a escolha é de HIERARQUIA, não de
   gosto, e é o que cria o nível 1 / nível 2 do dashboard:

     hero    — o número que responde a pergunta principal da tela. 1 ou 2.
     default — indicadores de apoio, em faixa.
     compact — dado de contexto dentro de um painel.

   Decisões deliberadas:
   - O RÓTULO vem primeiro e em mono/caixa alta; o número domina por
     tamanho, não por cor. Cor aqui é reservada pra estado (Delta).
   - Nada de borda colorida no topo do card (era o padrão antigo): oito
     cards com oito listras viram ruído e não significam nada.
   - `tabular-nums` em todo valor, pra coluna de número não dançar.
   ========================================================================= */

export function Metric({
  label,
  value,
  unit,
  hint,
  delta,
  deltaInvert,
  deltaLabel,
  icon,
  size = "default",
  align = "left",
  className,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  /** Sufixo pequeno colado no número (%, h, pts) — não entra no `value`
   *  pra não competir em tamanho com o dado. */
  unit?: string;
  hint?: string;
  delta?: number | null;
  deltaInvert?: boolean;
  deltaLabel?: string;
  icon?: React.ReactNode;
  size?: "hero" | "default" | "compact";
  align?: "left" | "center";
  className?: string;
  footer?: React.ReactNode;
}) {
  // O degrau grande só entra a partir de `sm`. Num celular de 390px com
  // duas colunas, 36px quebrava "R$ 31.480" em duas linhas no meio do
  // número — que é pior do que um número um pouco menor.
  // Rampa de três degraus no KPI de destaque. Num celular de 390px o
  // card fica com ~126px úteis; "R$ 31.480" a 36px não cabe e quebra no
  // meio do número, que é o pior resultado possível pra um dado
  // financeiro. Começa em 22px e só cresce quando há espaço.
  const valueClass =
    size === "hero"
      ? "text-metric-sm sm:text-metric lg:text-metric-lg"
      : size === "compact"
        ? "text-metric-sm"
        : "text-metric-sm sm:text-metric";

  return (
    <div
      data-print-block=""
      className={cn(
        "flex min-w-0 flex-col justify-between",
        size !== "compact" && "rounded-card border border-line bg-surface shadow-xs",
        size === "hero" ? "p-5" : size === "default" ? "p-4" : "",
        align === "center" && "items-center text-center",
        className
      )}
    >
      <div className="min-w-0">
        <div className={cn("mb-2 flex items-center gap-2", align === "center" && "justify-center")}>
          {icon && <span className="shrink-0 text-ink-3">{icon}</span>}
          <p className="min-w-0 font-mono text-label uppercase text-ink-3">{label}</p>
        </div>

        <p className={cn("flex items-baseline gap-1 text-ink tabular-nums", valueClass, align === "center" && "justify-center")}>
          <span className="min-w-0 break-words">{value}</span>
          {unit && <span className="text-body font-medium text-ink-3">{unit}</span>}
        </p>

        {(delta != null || hint) && (
          <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5", align === "center" && "justify-center")}>
            <Delta value={delta} invert={deltaInvert} size={size === "compact" ? "sm" : "md"} />
            {(deltaLabel || hint) && (
              // Quebra em até duas linhas em vez de cortar com reticências:
              // "83% do orçamento aprovado" virava "83% do orçamento ..."
              // no celular, que é a parte que menos importa da frase.
              <span className="line-clamp-2 text-caption text-ink-3">{deltaLabel ?? hint}</span>
            )}
          </div>
        )}
      </div>

      {footer && <div className="mt-3 border-t border-line pt-3">{footer}</div>}
    </div>
  );
}

/** Faixa de métricas: grade que respira em qualquer largura. Vira 2
 *  colunas no celular (nunca 1 — números curtos lado a lado leem melhor)
 *  e acomoda de 3 a 6 no desktop sem sobra. */
export function MetricRow({
  columns = 4,
  className,
  children,
}: {
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  children: React.ReactNode;
}) {
  const lg: Record<number, string> = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
  };
  return (
    <div className={cn("signal-stagger grid grid-cols-2 gap-3 sm:grid-cols-3", lg[columns], className)}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
   PROGRESS — barra de progresso.
   Sempre com rótulo textual do percentual ao lado: a barra sozinha é
   estimativa visual, o número é o dado.
   ------------------------------------------------------------------------- */
export function Progress({
  value,
  label,
  tone = "accent",
  size = "md",
  showValue = true,
  className,
}: {
  /** 0–100 */
  value: number;
  label?: string;
  tone?: "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const fill = {
    accent: "bg-brand-600",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[tone];

  return (
    <div className={cn("min-w-0", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="truncate text-caption text-ink-2">{label}</span>}
          {showValue && <span className="shrink-0 text-caption font-medium tabular-nums text-ink">{pct}%</span>}
        </div>
      )}
      <div
        className={cn("w-full overflow-hidden rounded-full bg-neutral-soft", size === "sm" ? "h-1" : "h-1.5")}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {/* origin-left + animate-bar-grow: a barra "cresce" da esquerda
            uma vez ao entrar — mostra que é uma medida, não uma moldura. */}
        <div
          className={cn("h-full origin-left rounded-full animate-bar-grow", fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Barra horizontal comparativa — pra ranking (investimento por criativo,
 *  entregas por tipo). Substitui gráfico de barra quando o que importa é
 *  a ordem e a proporção, não o eixo. */
export function BarRow({
  label,
  value,
  max,
  formatted,
  meta,
  colorVar = "--chart-1",
}: {
  label: string;
  value: number;
  max: number;
  formatted: string;
  meta?: string;
  colorVar?: string;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="min-w-0 py-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-small text-ink">{label}</span>
        <span className="shrink-0 text-small font-medium tabular-nums text-ink">{formatted}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-soft">
          <div
            className="h-full origin-left rounded-full animate-bar-grow"
            style={{ width: `${pct}%`, backgroundColor: `rgb(var(${colorVar}))` }}
          />
        </div>
        {meta && <span className="shrink-0 font-mono text-[0.6875rem] text-ink-3">{meta}</span>}
      </div>
    </div>
  );
}
