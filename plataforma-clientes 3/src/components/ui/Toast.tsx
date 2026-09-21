"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./cn";
import { Icon } from "./icons";

/* =========================================================================
   TOAST
   -------------------------------------------------------------------------
   O produto não tinha NENHUM feedback de ação: aprovar entrega, salvar
   tema, criar usuário — tudo acontecia em silêncio, e o usuário ficava
   sem saber se funcionou.

   Comportamento:
   - Ancorado embaixo no celular (perto do polegar) e no canto inferior
     direito no desktop.
   - aria-live="polite" + role="status": leitor de tela anuncia sem
     interromper o que a pessoa está fazendo. Erro vai como "assertive".
   - O timer PAUSA no hover e no foco — ninguém perde a mensagem tentando
     ler ou clicar na ação dela.
   ========================================================================= */

type ToastTone = "success" | "error" | "info" | "warning";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  duration: number;
  action?: { label: string; onClick: () => void };
};

type ToastInput = Omit<Toast, "id" | "duration" | "tone"> & { duration?: number };

type ToastApi = {
  success: (t: ToastInput | string) => void;
  error: (t: ToastInput | string) => void;
  info: (t: ToastInput | string) => void;
  warning: (t: ToastInput | string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Não explode em Server Component ou em teste isolado — só vira
    // no-op. Feedback visual nunca deve derrubar a página.
    return { success: () => {}, error: () => {}, info: () => {}, warning: () => {} };
  }
  return ctx;
}

const TONE = {
  success: { Ico: Icon.CheckCircle, color: "text-success", bar: "bg-success" },
  error: { Ico: Icon.AlertCircle, color: "text-danger", bar: "bg-danger" },
  warning: { Ico: Icon.AlertTriangle, color: "text-warning", bar: "bg-warning" },
  info: { Ico: Icon.Info, color: "text-info", bar: "bg-info" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, input: ToastInput | string) => {
    const normalized: ToastInput = typeof input === "string" ? { title: input } : input;
    const id = ++seq.current;
    setToasts((list) => [
      // No máximo 3 na tela: além disso vira parede e ninguém lê.
      ...list.slice(-2),
      { id, tone, duration: normalized.duration ?? (tone === "error" ? 7000 : 4500), ...normalized },
    ]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (t) => push("success", t),
      error: (t) => push("error", t),
      info: (t) => push("info", t),
      warning: (t) => push("warning", t),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end sm:p-0"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const { Ico, color, bar } = TONE[toast.tone];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.duration, onDismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-card",
        "border border-line bg-surface-raised shadow-lg",
        "animate-slide-left"
      )}
    >
      {/* Faixa de tom na lateral: identifica o tipo antes de ler, sem
          tingir o fundo inteiro (que atrapalharia o contraste do texto). */}
      <span className={cn("absolute inset-y-0 left-0 w-1", bar)} aria-hidden="true" />
      <div className="flex items-start gap-3 py-3 pl-5 pr-3">
        <Ico className={cn("mt-0.5 h-4 w-4 shrink-0", color)} />
        <div className="min-w-0 flex-1">
          <p className="text-small font-medium text-ink">{toast.title}</p>
          {toast.description && <p className="mt-0.5 text-caption text-ink-2">{toast.description}</p>}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-2 text-caption font-medium text-brand-600 underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Fechar notificação"
          className="-mr-1 shrink-0 rounded p-1 text-ink-3 transition hover:bg-neutral-soft hover:text-ink"
        >
          <Icon.X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
