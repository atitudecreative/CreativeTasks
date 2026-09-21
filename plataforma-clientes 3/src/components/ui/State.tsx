import { cn } from "./cn";
import { Icon } from "./icons";

/* =========================================================================
   ESTADOS: VAZIO, ERRO, CARREGANDO
   -------------------------------------------------------------------------
   Antes: uma linha de texto cinza dentro de uma caixa tracejada. Não
   explicava nada e não oferecia saída.

   Um estado vazio bom responde três coisas — o que é esse lugar, por que
   está vazio, e o que fazer agora. Os três parâmetros abaixo são
   exatamente isso, e `action` não é opcional por acidente: quando existe
   uma ação possível, ela tem que estar aqui.
   ========================================================================= */

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface/50 text-center",
        size === "sm" ? "px-5 py-8" : "px-6 py-14",
        className
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center justify-center rounded-full bg-neutral-soft text-ink-3",
          size === "sm" ? "h-9 w-9" : "h-12 w-12"
        )}
      >
        {icon ?? <Icon.Inbox className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />}
      </div>
      <p className={cn("text-ink", size === "sm" ? "text-h4" : "text-h3")}>{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-small text-ink-2">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Não foi possível carregar",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-panel border border-danger-line bg-danger-soft/40 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <Icon.AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-h3 text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-small text-ink-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------
   ALERT — aviso persistente no fluxo da página (não confundir com Toast,
   que é transitório e fala de uma ação recém-executada).
   ------------------------------------------------------------------------- */
export function Alert({
  tone = "info",
  title,
  action,
  onDismiss,
  className,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger" | "accent";
  title?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const conf = {
    info: { box: "border-info-line bg-info-soft", icon: "text-info", Ico: Icon.Info },
    success: { box: "border-success-line bg-success-soft", icon: "text-success", Ico: Icon.CheckCircle },
    warning: { box: "border-warning-line bg-warning-soft", icon: "text-warning", Ico: Icon.AlertTriangle },
    danger: { box: "border-danger-line bg-danger-soft", icon: "text-danger", Ico: Icon.AlertCircle },
    accent: { box: "border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/25", icon: "text-brand-600 dark:text-brand-300", Ico: Icon.Sparkles },
  }[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-card border px-4 py-3", conf.box, className)}
    >
      <conf.Ico className={cn("mt-0.5 h-4 w-4 shrink-0", conf.icon)} />
      <div className="min-w-0 flex-1">
        {title && <p className="text-small font-semibold text-ink">{title}</p>}
        {children && <div className={cn("text-small text-ink-2", title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar aviso"
          className="-mr-1 shrink-0 rounded p-1 text-ink-3 transition hover:bg-surface/60 hover:text-ink"
        >
          <Icon.X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   SKELETON
   Usa a varredura de brilho definida em globals.css (.signal-skeleton) em
   vez do animate-pulse: o pulse pisca a tela inteira e cansa; a varredura
   sugere carregamento direcional e é mais discreta.
   ------------------------------------------------------------------------- */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={style} className={cn("signal-skeleton rounded-[6px]", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Skeletons que imitam o layout REAL de cada bloco. O skeleton antigo
 *  mostrava uma forma e entregava outra, o que dá a sensação de a página
 *  "pular" — o que se ganha em tempo percebido se perde em confiança. */
export function SkeletonMetricRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border border-line bg-surface p-4 shadow-xs">
          <Skeleton className="mb-3 h-2.5 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="mt-2 h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({ height = "h-64", title = true }: { height?: string; title?: boolean }) {
  return (
    <div className="rounded-panel border border-line bg-surface shadow-xs">
      {title && (
        <div className="border-b border-line px-5 py-3">
          <Skeleton className="h-3.5 w-40" />
        </div>
      )}
      <div className={cn("flex items-end gap-2 p-5", height)}>
        {[55, 80, 42, 95, 68, 88, 50].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-xs">
      <div className="flex gap-4 border-b border-line bg-surface-sunken px-4 py-2.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-line px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3", c === 0 ? "flex-[2]" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-card border border-line bg-surface shadow-xs">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="p-4">
            <Skeleton className="mb-2.5 h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
