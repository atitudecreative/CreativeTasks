"use client";

import { forwardRef, useId } from "react";
import { cn } from "./cn";
import { Icon } from "./icons";

/* =========================================================================
   CAMPOS DE FORMULÁRIO
   -------------------------------------------------------------------------
   Todo campo passa por <Field>, que resolve de uma vez três coisas que
   antes ficavam soltas em cada tela:

   1. Vínculo label <-> controle (htmlFor/id gerado), pra clicar no rótulo
      focar o campo e o leitor de tela anunciar certo.
   2. Erro que NÃO depende só de cor: ícone + texto + aria-invalid +
      aria-describedby. Daltônico enxerga o erro igual.
   3. Altura, raio, foco e estado desabilitado idênticos em input, select
      e textarea — antes cada um tinha o seu.
   ========================================================================= */

const CONTROL_BASE = cn(
  "w-full rounded-control border bg-surface text-body text-ink",
  "placeholder:text-ink-3/70",
  "transition-[border-color,box-shadow,background-color] duration-120 ease-snap",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-3",
  "read-only:bg-surface-sunken"
);

const CONTROL_TONE = {
  normal: "border-line-strong hover:border-ink-3/45 focus:border-brand-500 focus:shadow-focus focus:outline-none",
  invalid: "border-danger/70 hover:border-danger focus:border-danger focus:shadow-[0_0_0_2px_rgb(var(--surface)),0_0_0_4px_rgb(var(--danger)/0.45)] focus:outline-none",
};

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  labelAddon,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  /** Conteúdo alinhado à direita do rótulo (ex: contador, "opcional"). */
  labelAddon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-caption font-medium text-ink-2">
            {label}
            {required && (
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {labelAddon}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-caption text-danger">
          <Icon.AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-caption text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------- INPUT ---------------------------- */

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  containerClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, iconLeft, iconRight, className, containerClassName, id, required, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error || hint ? `${inputId}-desc` : undefined;

  const control = (
    <div className="relative">
      {iconLeft && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">{iconLeft}</span>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          CONTROL_BASE,
          error ? CONTROL_TONE.invalid : CONTROL_TONE.normal,
          "h-control-lg px-3",
          iconLeft && "pl-9",
          iconRight && "pr-9",
          className
        )}
        {...props}
      />
      {iconRight && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">{iconRight}</span>
      )}
    </div>
  );

  if (!label && !hint && !error) return control;

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId} className={containerClassName}>
      {control}
      {describedBy && <span id={describedBy} className="sr-only" />}
    </Field>
  );
});

/* ---------------------------- TEXTAREA ---------------------------- */

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
  containerClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, containerClassName, id, required, rows = 4, ...props },
  ref
) {
  const autoId = useId();
  const areaId = id ?? autoId;

  const control = (
    <textarea
      ref={ref}
      id={areaId}
      rows={rows}
      required={required}
      aria-invalid={error ? true : undefined}
      className={cn(CONTROL_BASE, error ? CONTROL_TONE.invalid : CONTROL_TONE.normal, "resize-y px-3 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );

  if (!label && !hint && !error) return control;

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={areaId} className={containerClassName}>
      {control}
    </Field>
  );
});

/* ---------------------------- SELECT ---------------------------- */

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string | null;
  containerClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, containerClassName, id, required, children, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id ?? autoId;

  // `containerClassName` valia só quando havia rótulo; sem rótulo a função
  // devolvia o controle cru e a classe era descartada em silêncio. É por
  // ela que a barra de filtros consegue dizer "dois por linha no celular".
  const control = (
    <div className={cn("relative", !label && !hint && !error && containerClassName)}>
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          CONTROL_BASE,
          error ? CONTROL_TONE.invalid : CONTROL_TONE.normal,
          // appearance-none + chevron próprio: a seta nativa do select é
          // diferente em cada SO e não acompanha o tema escuro.
          "h-control-lg cursor-pointer appearance-none py-0 pl-3 pr-9",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <Icon.ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
    </div>
  );

  if (!label && !hint && !error) return control;

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={selectId} className={containerClassName}>
      {control}
    </Field>
  );
});

/* ---------------------------- SEARCH ---------------------------- */

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Buscar...",
  className,
  ...props
}: Omit<InputProps, "onChange" | "value"> & {
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <div className={cn("relative", className)}>
      <Icon.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          CONTROL_BASE,
          CONTROL_TONE.normal,
          "h-control-lg pl-9 pr-9",
          // Some com o "x" nativo do WebKit: temos um botão próprio, que
          // é acessível e combina com o tema.
          "[&::-webkit-search-cancel-button]:appearance-none"
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Limpar busca"
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 transition hover:bg-neutral-soft hover:text-ink"
        >
          <Icon.X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ---------------------------- CHECKBOX / RADIO ---------------------------- */

export function Checkbox({
  label,
  description,
  className,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode; description?: string }) {
  const autoId = useId();
  const boxId = id ?? autoId;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        type="checkbox"
        id={boxId}
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-[5px] border-line-strong bg-surface text-brand-600",
          "accent-brand-600 transition duration-120",
          "focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-45"
        )}
        {...props}
      />
      {(label || description) && (
        <label htmlFor={boxId} className="cursor-pointer select-none">
          {label && <span className="block text-small text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-caption text-ink-3">{description}</span>}
        </label>
      )}
    </div>
  );
}

export function Radio({
  label,
  className,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  const autoId = useId();
  const radioId = id ?? autoId;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <input
        type="radio"
        id={radioId}
        className="h-4 w-4 shrink-0 cursor-pointer border-line-strong accent-brand-600 focus-visible:shadow-focus disabled:opacity-45"
        {...props}
      />
      {label && (
        <label htmlFor={radioId} className="cursor-pointer select-none text-small text-ink">
          {label}
        </label>
      )}
    </div>
  );
}

/* ---------------------------- SWITCH ---------------------------- */

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  size = "md",
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const track = size === "sm" ? "h-[18px] w-8" : "h-5 w-9";
  const knob = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const travel = size === "sm" ? "translate-x-[14px]" : "translate-x-4";

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={typeof label === "string" ? label : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full p-0.5",
        "transition-colors duration-180 ease-snap",
        "disabled:cursor-not-allowed disabled:opacity-45",
        track,
        checked ? "bg-brand-600" : "bg-line-strong"
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow-xs transition-transform duration-180 ease-snap",
          knob,
          checked ? travel : "translate-x-0"
        )}
      />
    </button>
  );

  if (!label && !description) return <span className={className}>{control}</span>;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      {control}
      <div className="min-w-0">
        {label && <span className="block text-small font-medium text-ink">{label}</span>}
        {description && <span className="mt-0.5 block text-caption text-ink-3">{description}</span>}
      </div>
    </div>
  );
}
