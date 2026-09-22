import { cn } from "./cn";

/* =========================================================================
   LAYOUT DE PÁGINA
   -------------------------------------------------------------------------
   Duas peças, uma decisão.

   A decisão: em 1440px a plataforma usava ~1110px e deixava o resto branco.
   Não é "respiro" — é a mesma tela de notebook esticada, e a sensação é de
   produto inacabado. Mas encher a largura com a lista principal também é
   errado: linha de tabela com 1300px de comprimento é ilegível, o olho
   perde a linha na volta.

   A saída é a que jornal e painel de instrumento usam há décadas: uma
   COLUNA PRINCIPAL de largura confortável e um TRILHO ao lado, com o que
   contextualiza — o recorte, o resumo, o que está fora do normal. No
   celular o trilho desce para depois do conteúdo, porque ali ele é apoio,
   não companhia.
   ========================================================================= */

export function PageBody({
  rail,
  /** Trilho acima do conteúdo no celular (quando é resumo, não apoio). */
  railFirstOnMobile = false,
  className,
  children,
}: {
  rail?: React.ReactNode;
  railFirstOnMobile?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (!rail) {
    return <div className={cn("min-w-0", className)}>{children}</div>;
  }

  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]", className)}>
      <div className={cn("min-w-0", railFirstOnMobile && "order-2 xl:order-1")}>{children}</div>
      <aside
        className={cn(
          "min-w-0 space-y-4",
          railFirstOnMobile && "order-1 xl:order-2",
          // Gruda no trilho a partir de xl: rolando uma lista longa, o
          // resumo continua à vista. `h-fit` impede que a coluna estique e
          // quebre o sticky.
          "xl:sticky xl:top-[calc(theme(spacing.header)+1.25rem)] xl:h-fit"
        )}
      >
        {rail}
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Bloco do trilho
   -------------------------------------------------------------------------
   Sem borda nem sombra de propósito: o trilho é margem, não conteúdo
   principal. O que separa um bloco do outro é o rótulo em versalete e o
   espaço — o mesmo recurso que separa seções num relatório impresso.
   ------------------------------------------------------------------------- */
export function RailBlock({
  label,
  action,
  className,
  children,
}: {
  label?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      {(label || action) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {label && <p className="font-mono text-label uppercase text-ink-3">{label}</p>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------
   Estatística de trilho
   -------------------------------------------------------------------------
   Número + rótulo, sem caixa. Usado em série, alinhado à esquerda: vira uma
   coluna de números legível de cima a baixo, que é como se lê um resumo —
   e não quatro cartões lado a lado, que é como se lê um painel de
   aeroporto.
   ------------------------------------------------------------------------- */
export function RailStat({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "danger" | "warning" | "success";
  href?: string;
}) {
  const cor =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-ink";

  const corpo = (
    <>
      <p className="font-mono text-label uppercase text-ink-3">{label}</p>
      <p className={cn("mt-0.5 text-metric-sm tabular-nums", cor)}>{value}</p>
      {hint && <p className="mt-0.5 text-caption text-ink-3">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="-mx-2 block rounded-control px-2 py-1.5 transition-colors duration-120 hover:bg-surface-sunken"
      >
        {corpo}
      </a>
    );
  }
  return <div className="py-1.5">{corpo}</div>;
}

/* -------------------------------------------------------------------------
   Barra de ferramentas da tela
   -------------------------------------------------------------------------
   Busca + filtros numa faixa só. Fica ACIMA do PageBody, ocupando a
   largura toda da página: o filtro vale para o conteúdo e para o trilho ao
   mesmo tempo, então prendê-lo dentro de uma das duas colunas mentiria
   sobre o alcance dele.
   ------------------------------------------------------------------------- */
export function Toolbar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-print="hide"
      className={cn("mb-4 flex flex-wrap items-center gap-2", className)}
    >
      {children}
    </div>
  );
}
