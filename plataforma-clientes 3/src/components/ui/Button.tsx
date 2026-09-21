"use client";

import { forwardRef } from "react";
import { cn } from "./cn";
import { Icon } from "./icons";

/* =========================================================================
   BUTTON
   -------------------------------------------------------------------------
   Um único componente para toda ação do produto. Antes cada tela
   re-escrevia a string Tailwind à mão, então "salvar" tinha uma cara em
   Entregas e outra em Usuários.

   Regras de hierarquia (é o que dá a leitura premium — não a cor):
   - primary  : UMA por tela. A ação que a tela existe pra fazer.
   - secondary: ação de apoio, contorno.
   - ghost    : ação terciária / dentro de linha de tabela.
   - danger   : destrutiva, sempre com confirmação antes.
   - link     : navegação que parece texto.

   Microinteração: escala 0.98 no :active. É o feedback tátil que faz o
   clique "responder" — 120ms, nada além disso.
   ========================================================================= */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle" | "link";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-xs hover:bg-brand-700 hover:shadow-sm active:bg-brand-800 disabled:hover:bg-brand-600",
  secondary:
    "border border-line-strong bg-surface text-ink shadow-xs hover:border-ink-3/40 hover:bg-surface-sunken active:bg-canvas-sunken",
  subtle:
    "bg-neutral-soft text-ink-2 hover:bg-line hover:text-ink active:bg-line-strong",
  ghost: "text-ink-2 hover:bg-neutral-soft hover:text-ink active:bg-line",
  danger:
    "bg-danger text-white shadow-xs hover:brightness-110 active:brightness-95",
  link: "text-brand-600 underline-offset-4 hover:underline p-0 h-auto",
};

const SIZE: Record<Size, string> = {
  sm: "h-control-sm gap-1.5 px-2.5 text-caption",
  md: "h-control gap-2 px-3.5 text-small",
  lg: "h-control-lg gap-2 px-4 text-body",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Mostra spinner e bloqueia o clique. O rótulo continua visível pro
   *  botão não mudar de largura no meio da ação. */
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    iconLeft,
    iconRight,
    fullWidth,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-medium",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-120 ease-snap",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        variant !== "link" && SIZE[size],
        VARIANT[variant],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading ? (
        <Icon.Loader className={cn("animate-spin", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
});

/* -------------------------------------------------------------------------
   ICON BUTTON — botão só de ícone.
   `label` é OBRIGATÓRIO: vira aria-label e title. Sem isso o botão fica
   mudo pra leitor de tela, que é exatamente o buraco que existia antes.
   ------------------------------------------------------------------------- */
export type IconButtonProps = Omit<ButtonProps, "iconLeft" | "iconRight" | "children" | "fullWidth"> & {
  label: string;
  children: React.ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "ghost", size = "md", className, children, loading, disabled, type = "button", ...props },
  ref
) {
  const box = size === "sm" ? "h-control-sm w-control-sm" : size === "lg" ? "h-control-lg w-control-lg" : "h-control w-control";

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-120 ease-snap",
        "active:scale-[0.94] disabled:pointer-events-none disabled:opacity-45",
        box,
        VARIANT[variant],
        className
      )}
      {...props}
    >
      {loading ? <Icon.Loader className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
});
