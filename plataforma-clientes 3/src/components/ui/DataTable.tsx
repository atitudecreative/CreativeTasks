import { cn } from "./cn";

/* =========================================================================
   TABELA
   -------------------------------------------------------------------------
   Primitivos, não um "DataTable mágico": cada tela do produto tem colunas
   e regras próprias, e uma abstração genérica acabaria brigando com elas.
   O que está padronizado aqui é o que precisava ser: densidade, alinhamento,
   comportamento de cabeçalho e — principalmente — o que acontece no
   celular.

   Regra de responsividade das tabelas (a auditoria achou 5 tabelas sem
   nenhum tratamento): TableScroll fixa a primeira coluna e rola o resto
   na horizontal. Onde a tabela é o conteúdo principal, o padrão preferido
   continua sendo trocar por lista de cards abaixo de `sm`.

   Números vão sempre em `TableCell numeric`: alinhamento à direita +
   tabular-nums, pra a coluna ser comparável de bater o olho.
   ========================================================================= */

export function TableScroll({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      // tabIndex=0 + role=region: uma área que rola precisa ser alcançável
      // e rolável pelo teclado, senão o conteúdo cortado fica inacessível.
      tabIndex={0}
      role="region"
      aria-label="Tabela rolável"
      className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}
    >
      {children}
    </div>
  );
}

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return <table className={cn("w-full min-w-full border-collapse text-left", className)}>{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-line bg-surface-sunken">{children}</thead>;
}

export function TH({
  numeric,
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-2.5 font-mono text-label uppercase text-ink-3",
        numeric && "text-right",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({
  className,
  interactive,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        "transition-colors duration-120",
        interactive && "cursor-pointer hover:bg-surface-sunken",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TD({
  numeric,
  strong,
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean; strong?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-small align-middle",
        numeric ? "text-right tabular-nums text-ink" : "text-ink-2",
        strong && "font-medium text-ink",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** Linha de "nenhum resultado" dentro da tabela — mantém o cabeçalho
 *  visível, que é o que diz ao usuário quais filtros ele pode afrouxar. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-small text-ink-3">
        {children}
      </td>
    </tr>
  );
}
