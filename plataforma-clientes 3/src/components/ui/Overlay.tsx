"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "./cn";
import { Icon } from "./icons";
import { IconButton } from "./Button";

/* =========================================================================
   SOBREPOSIÇÕES: MODAL E DRAWER
   -------------------------------------------------------------------------
   Um hook único cuida do que todo diálogo acessível precisa e que o
   produto não fazia em lugar nenhum:

   - Esc fecha.
   - Foco vai pro diálogo ao abrir e VOLTA pro gatilho ao fechar (senão o
     usuário de teclado é jogado pro topo da página).
   - Tab circula dentro do diálogo (focus trap) — sem isso a tabulação
     escapa pro conteúdo de trás, que está visualmente inerte.
   - Rolagem do body travada, sem o "pulo" da barra de rolagem sumindo.
   ========================================================================= */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useDialogBehavior(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;

      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    // Compensa a largura da barra de rolagem pra página não "pular" um
    // punhado de pixels pro lado quando o overflow é travado.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    document.addEventListener("keydown", handleKeyDown, true);
    const focusTimer = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
      (el ?? ref.current)?.focus();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      restoreTo.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  return ref;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useDialogBehavior(open, onClose);
  if (!open) return null;

  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <div
      className="fixed inset-0 z-dialog flex items-end justify-center overflow-y-auto bg-ink/45 p-0 animate-fade-in sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "w-full bg-surface-raised shadow-dialog outline-none",
          // Celular: folha que sobe de baixo, colada no rodapé. Desktop:
          // diálogo centrado. Mesma estrutura, dois comportamentos.
          "animate-slide-up rounded-t-dialog sm:animate-scale-in sm:rounded-dialog",
          "max-h-[92vh] overflow-y-auto sm:max-h-[86vh]",
          width
        )}
      >
        {/* Alça visual — só no celular, sinaliza que é arrastável/fechável. */}
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <h2 className="text-h2 text-ink">{title}</h2>
            {description && <p className="mt-1 text-small text-ink-2">{description}</p>}
          </div>
          <IconButton label="Fechar" size="sm" onClick={onClose} className="-mr-1.5 -mt-0.5">
            <Icon.X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="px-5 pb-5 sm:px-6">{children}</div>

        {footer && (
          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-raised px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useDialogBehavior(open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-dialog flex bg-ink/45 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "flex h-full w-[min(20rem,86vw)] flex-col bg-surface shadow-xl outline-none",
          side === "right" ? "ml-auto animate-slide-left" : "mr-auto animate-slide-left",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
