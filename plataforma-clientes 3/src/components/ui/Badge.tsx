import { cn } from "./cn";
import { Icon } from "./icons";

/* =========================================================================
   BADGE / STATUS
   -------------------------------------------------------------------------
   Antes o produto pintava badge com nove paletas diferentes (sky, indigo,
   teal, cyan, violet, rose...) escolhidas caso a caso. Aqui existem SEIS
   tons, e cada um quer dizer uma coisa:

     neutral  — informação, sem juízo de valor
     accent   — ligado à marca / em foco agora
     success  — concluído, aprovado, saudável
     warning  — precisa de atenção, aguardando alguém
     danger   — atrasado, crítico, cancelado
     info     — em andamento, planejado

   `dot` acrescenta um ponto colorido: em tabela densa ele lê mais rápido
   que a pílula cheia. E como o rótulo textual está SEMPRE presente, a cor
   nunca é o único portador de significado (WCAG 1.4.1).
   ========================================================================= */

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONE: Record<BadgeTone, { soft: string; solid: string; dot: string; outline: string }> = {
  neutral: {
    soft: "bg-neutral-soft text-ink-2",
    solid: "bg-ink text-ink-inverse",
    dot: "bg-ink-3",
    outline: "border-line-strong text-ink-2",
  },
  accent: {
    soft: "bg-brand-50 text-brand-700 dark:bg-brand-900/35 dark:text-brand-200",
    solid: "bg-brand-600 text-white",
    dot: "bg-brand-500",
    outline: "border-brand-300 text-brand-700 dark:text-brand-200",
  },
  success: {
    soft: "bg-success-soft text-success",
    solid: "bg-success text-white",
    dot: "bg-success",
    outline: "border-success-line text-success",
  },
  warning: {
    soft: "bg-warning-soft text-warning",
    solid: "bg-warning text-white",
    dot: "bg-warning",
    outline: "border-warning-line text-warning",
  },
  danger: {
    soft: "bg-danger-soft text-danger",
    solid: "bg-danger text-white",
    dot: "bg-danger",
    outline: "border-danger-line text-danger",
  },
  info: {
    soft: "bg-info-soft text-info",
    solid: "bg-info text-white",
    dot: "bg-info",
    outline: "border-info-line text-info",
  },
};

export function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  dot,
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[0.6875rem] leading-4" : "px-2 py-0.5 text-caption",
        variant === "outline" ? cn("border bg-transparent", t.outline) : variant === "solid" ? t.solid : t.soft,
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot)} aria-hidden="true" />}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Etiqueta de código: identificador de demanda/campanha (DEM-2026-0042).
 *  Mono porque é um código — o usuário vai comparar e digitar. */
export function CodeTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] bg-neutral-soft px-1.5 py-0.5 font-mono text-[0.6875rem] leading-4 text-ink-3",
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------
   DELTA — variação contra período/evento anterior.
   Verde/vermelho + SETA + sinal: três canais, nenhum depende só de cor.
   `invert` existe porque nem toda subida é boa (CPA, CPC, atraso).
   ------------------------------------------------------------------------- */
export function Delta({
  value,
  suffix = "%",
  invert = false,
  className,
  size = "md",
}: {
  value: number | null | undefined;
  suffix?: string;
  invert?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  if (value == null || !Number.isFinite(value)) return null;

  const flat = Math.abs(value) < 0.05;
  const positive = value > 0;
  const good = invert ? !positive : positive;

  const Arrow = flat ? Icon.Flat : positive ? Icon.TrendingUp : Icon.TrendingDown;
  const tone = flat ? "text-ink-3" : good ? "text-success" : "text-danger";

  return (
    <span
      className={cn("inline-flex items-center gap-1 font-medium tabular-nums", size === "sm" ? "text-[0.6875rem]" : "text-caption", tone, className)}
    >
      <Arrow className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {flat ? "estável" : `${positive ? "+" : ""}${value.toFixed(1)}${suffix}`}
    </span>
  );
}
