import { cn } from "./cn";

/* =========================================================================
   AVATAR
   Sem foto no banco: usa iniciais sobre um fundo derivado do nome de forma
   DETERMINÍSTICA (mesma pessoa, sempre a mesma cor). Isso dá identidade
   visual às listas de usuário sem inventar dado nenhum.
   ========================================================================= */

const PALETTE = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6", "--chart-7"];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueOf(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const box = {
    xs: "h-6 w-6 text-[0.625rem]",
    sm: "h-7 w-7 text-[0.6875rem]",
    md: "h-9 w-9 text-caption",
    lg: "h-12 w-12 text-small",
  }[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar vem de URL externa sem domínio conhecido em build time
      <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover", box, className)} />
    );
  }

  const color = hueOf(name);
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white", box, className)}
      style={{ backgroundColor: `rgb(var(${color}) / 0.92)` }}
    >
      {initialsOf(name)}
    </span>
  );
}
