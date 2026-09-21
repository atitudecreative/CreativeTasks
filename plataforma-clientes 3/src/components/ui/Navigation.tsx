"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";
import { Icon } from "./icons";

/* =========================================================================
   NAVEGAÇÃO INTERNA: TABS, BREADCRUMB, PAGINATION, TOOLTIP, DROPDOWN
   ========================================================================= */

/* ------------------------------- TABS -------------------------------
   Duas aparências, mesma semântica ARIA (role=tablist/tab + setas do
   teclado). `segmented` pra alternar visão de um mesmo objeto (o que a
   tela de campanha faz); `underline` pra seções de página.
   -------------------------------------------------------------------- */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  variant = "segmented",
  className,
}: {
  tabs: { value: T; label: string; icon?: React.ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  variant?: "segmented" | "underline";
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.value === value);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].value);
    refs.current[tabs[next].value]?.focus();
  }

  if (variant === "underline") {
    return (
      <div role="tablist" onKeyDown={onKeyDown} className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}>
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              ref={(el) => { refs.current[t.value] = el; }}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.value)}
              className={cn(
                "relative -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-small font-medium transition-colors duration-120",
                active
                  ? "border-brand-600 text-ink"
                  : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink-2"
              )}
            >
              {t.icon}
              {t.label}
              {t.count != null && (
                <span className={cn("rounded-full px-1.5 py-0.5 font-mono text-[0.625rem] tabular-nums", active ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "bg-neutral-soft text-ink-3")}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn("inline-flex max-w-full gap-0.5 overflow-x-auto rounded-control bg-neutral-soft p-0.5", className)}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => { refs.current[t.value] = el; }}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-caption font-medium",
              "transition-[background-color,color,box-shadow] duration-180 ease-snap",
              active ? "bg-surface text-ink shadow-xs" : "text-ink-3 hover:text-ink-2"
            )}
          >
            {t.icon}
            {t.label}
            {t.count != null && <span className="font-mono text-[0.625rem] tabular-nums opacity-70">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------- BREADCRUMB ---------------------------- */
export function Breadcrumb({ items, className }: { items: { label: string; href?: string }[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Trilha de navegação" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-caption text-ink-3">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <Icon.ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
              {item.href && !last ? (
                <Link href={item.href} className="truncate rounded-sm transition-colors hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span className={cn("truncate", last && "text-ink-2")} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------------------------- PAGINATION ---------------------------- */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  total?: number;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  // Janela deslizante de páginas: no celular só mostra "3 de 12" (os
  // botões numerados não cabem), no desktop mostra até 5 números.
  const window = 2;
  const pages: number[] = [];
  for (let p = Math.max(1, page - window); p <= Math.min(pageCount, page + window); p++) pages.push(p);

  const btn =
    "flex h-8 min-w-8 items-center justify-center rounded-control px-2 text-caption font-medium tabular-nums transition duration-120 disabled:opacity-35 disabled:pointer-events-none";

  return (
    <nav aria-label="Paginação" className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      {total != null && (
        <p className="text-caption text-ink-3">
          <span className="font-medium tabular-nums text-ink-2">{total}</span> {total === 1 ? "registro" : "registros"}
        </p>
      )}
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={() => onPageChange(1)} disabled={page === 1} aria-label="Primeira página" className={cn(btn, "text-ink-3 hover:bg-neutral-soft hover:text-ink")}>
          <Icon.ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Página anterior" className={cn(btn, "text-ink-3 hover:bg-neutral-soft hover:text-ink")}>
          <Icon.ChevronLeft className="h-4 w-4" />
        </button>

        <span className="px-2 text-caption tabular-nums text-ink-2 sm:hidden">
          {page} / {pageCount}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(btn, p === page ? "bg-ink text-ink-inverse" : "text-ink-2 hover:bg-neutral-soft hover:text-ink")}
            >
              {p}
            </button>
          ))}
        </span>

        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === pageCount} aria-label="Próxima página" className={cn(btn, "text-ink-3 hover:bg-neutral-soft hover:text-ink")}>
          <Icon.ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onPageChange(pageCount)} disabled={page === pageCount} aria-label="Última página" className={cn(btn, "text-ink-3 hover:bg-neutral-soft hover:text-ink")}>
          <Icon.ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

/* ------------------------------ TOOLTIP ------------------------------
   Aparece no hover E no foco por teclado (um tooltip que só responde ao
   mouse é inútil pra quem tabula). Não é usado pra informação essencial —
   só pra explicar um rótulo abreviado, tipo "CPA".
   --------------------------------------------------------------------- */
export function Tooltip({
  content,
  side = "top",
  className,
  style,
  children,
}: {
  content: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
  /** Necessário quando o tooltip É o item de layout (ex: um segmento de
   *  barra empilhada, cuja largura vem em %) — sem isso o wrapper
   *  inline-flex encolhe pro tamanho do conteúdo e engole a largura. */
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span style={style} className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-dialog w-max max-w-[15rem] -translate-x-1/2 rounded-control",
          "bg-surface-inverse px-2 py-1 text-[0.6875rem] leading-4 text-ink-inverse shadow-md",
          "opacity-0 transition-opacity duration-120 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
        )}
      >
        {content}
      </span>
    </span>
  );
}

/* ----------------------------- DROPDOWN -----------------------------
   Menu de ações. Fecha ao clicar fora, no Esc, e devolve o foco pro
   gatilho. As setas navegam entre os itens.
   --------------------------------------------------------------------- */
export function DropdownMenu({
  trigger,
  align = "end",
  className,
  children,
}: {
  trigger: (props: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => React.ReactNode;
  align?: "start" | "end";
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      if (items.length === 0) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next < 0 ? 0 : next].focus();
    }

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef })}
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-dialog mt-1.5 min-w-[13rem] origin-top overflow-hidden rounded-card border border-line",
            "bg-surface-raised p-1 shadow-lg animate-scale-in",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  href,
  onClick,
  tone = "default",
  className,
  children,
}: {
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn(
    "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-small transition-colors duration-120",
    tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-ink-2 hover:bg-neutral-soft hover:text-ink",
    className
  );

  if (href) {
    return (
      <Link role="menuitem" href={href} className={classes}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button role="menuitem" type="button" onClick={onClick} className={classes}>
      {icon}
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2.5 pb-1 pt-2 font-mono text-label uppercase text-ink-3">{children}</p>;
}

export function MenuSeparator() {
  return <hr className="my-1 border-line" />;
}
