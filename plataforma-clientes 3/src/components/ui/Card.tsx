import { cn } from "./cn";

/* =========================================================================
   SUPERFÍCIES
   -------------------------------------------------------------------------
   Três níveis, e só três — é o que impede a tela de virar "parede de
   cards", que era o diagnóstico da auditoria:

   - Section : agrupa conteúdo por SIGNIFICADO. Não tem caixa; o que
               separa é o cabeçalho e o espaço. Use como padrão.
   - Card    : caixa de verdade. Só quando o conteúdo é uma UNIDADE
               autônoma (um KPI, uma entrega, um registro).
   - Panel   : caixa com cabeçalho próprio, pra gráfico/tabela que precisa
               de título e ação no topo.

   Se tudo virar Card, nada tem hierarquia. A regra prática: um Card
   dentro de outro Card é sinal de que o de fora devia ser Section.
   ========================================================================= */

export function Section({
  id,
  title,
  description,
  eyebrow,
  action,
  className,
  headerClassName,
  children,
  as: Tag = "section",
}: {
  /** Âncora de rolagem — usado pelo relatório de campanha, que navega
   *  por links de seção em vez de abas. */
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
  as?: "section" | "div";
}) {
  return (
    <Tag id={id} className={cn("min-w-0", className)}>
      {(title || action || eyebrow) && (
        <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2", headerClassName)}>
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1.5 font-mono text-label uppercase text-ink-3">{eyebrow}</p>
            )}
            {title && <h2 className="text-h2 text-ink">{title}</h2>}
            {description && <p className="mt-1 max-w-prose text-small text-ink-2">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

export function Card({
  className,
  interactive,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Card clicável: ganha resposta de hover e cursor. Só use quando o
   *  card inteiro for mesmo um alvo (envolvido por Link/button). */
  interactive?: boolean;
}) {
  return (
    <div
      data-print-block=""
      className={cn(
        "min-w-0 rounded-card border border-line bg-surface shadow-xs",
        interactive &&
          "cursor-pointer transition-[border-color,box-shadow,transform] duration-180 ease-snap hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  noPadding,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Pra tabela — a tabela desenha o próprio padding por célula. */
  noPadding?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-print-block=""
      className={cn("flex min-w-0 flex-col rounded-panel border border-line bg-surface shadow-xs", className)}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h3 className="truncate text-h4 text-ink">{title}</h3>}
            {description && <p className="mt-0.5 truncate text-caption text-ink-3">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-4 sm:p-5", "min-w-0 flex-1", bodyClassName)}>{children}</div>
    </div>
  );
}

/** Régua de separação com rótulo opcional — alternativa ao card quando só
 *  se quer marcar uma virada de assunto dentro de uma coluna. */
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn("border-line", className)} />;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <hr className="flex-1 border-line" />
      <span className="font-mono text-label uppercase text-ink-3">{label}</span>
      <hr className="flex-1 border-line" />
    </div>
  );
}
