"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "./cn";
import { Icon } from "./icons";

/* =========================================================================
   PRANCHA (Board)
   -------------------------------------------------------------------------
   A peça que substitui a parede de cards.

   O diagnóstico: a aba Demandas empilhava SETE caixas com borda e sombra,
   uma por mês. A aba Campanhas punha cada campanha numa caixa com 200px de
   placeholder. Caixa é um recurso caro — ela diz "isto aqui é uma unidade
   separada" — e quando tudo é caixa, nada tem hierarquia e a tela vira uma
   grade de retângulos competindo entre si.

   A prancha é UMA superfície. O que separa os itens é uma linha de um
   pixel; o que separa os grupos é um cabeçalho que gruda no topo enquanto
   você rola. É como uma folha de papel pautada, e é o que permite densidade
   sem barulho: cabe três vezes mais informação na mesma altura, e ainda
   sobra silêncio entre as coisas.

   Regra de uso, para a parede não voltar:
     Board  — coleção de itens do MESMO tipo, de tamanho variável (listas).
     Card   — uma unidade autônoma que se lê sozinha (uma entrega, um KPI).
     Panel  — um gráfico ou tabela que precisa de título e ação no topo.
   ========================================================================= */

export function Board({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-print-block=""
      className={cn(
        "min-w-0 overflow-hidden rounded-panel border border-line bg-surface shadow-xs",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Grupo dentro da prancha
   -------------------------------------------------------------------------
   O cabeçalho é `sticky`: rolando uma lista de 200 linhas, você nunca perde
   de vista em que mês está. É a informação que um card com borda dava de
   graça (o limite visível do bloco) e que a lista contínua precisa devolver
   de outro jeito.
   ------------------------------------------------------------------------- */
export function BoardGroup({
  title,
  meta,
  trailing,
  collapsible = false,
  defaultOpen = true,
  sticky = true,
  count,
  children,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** Canto direito do cabeçalho — um badge de alerta, uma contagem. */
  trailing?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  sticky?: boolean;
  /** Mostrado ao lado do título, em mono, como referência de tamanho. */
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const aberto = !collapsible || open;

  const conteudoCabecalho = (
    <>
      {collapsible && (
        <Icon.ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform duration-180 ease-snap",
            aberto && "rotate-90"
          )}
        />
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-h4 text-ink">{title}</span>
          {count != null && (
            <span className="font-mono text-label uppercase text-ink-3">{count}</span>
          )}
        </span>
        {meta && <span className="mt-0.5 block truncate text-caption text-ink-3">{meta}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-1.5">{trailing}</span>}
    </>
  );

  return (
    <section className="border-b border-line last:border-b-0">
      <div
        className={cn(
          // A faixa do grupo é levemente afundada e translúcida: grudada no
          // topo, ela precisa cobrir as linhas que passam por baixo sem
          // virar uma barra opaca pesada.
          "border-b border-line bg-surface-sunken/85 backdrop-blur-sm",
          sticky && "sticky top-0 z-10"
        )}
      >
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={aberto}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-120 hover:bg-surface-sunken sm:px-5"
          >
            {conteudoCabecalho}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-2.5 sm:px-5">{conteudoCabecalho}</div>
        )}
      </div>
      {aberto && <div>{children}</div>}
    </section>
  );
}

/* -------------------------------------------------------------------------
   Linha da prancha
   -------------------------------------------------------------------------
   Um item. Com `href`, a linha inteira é o alvo — não um link minúsculo no
   título. A seta só aparece no hover: ela é confirmação, não decoração
   permanente.
   ------------------------------------------------------------------------- */
export function BoardRow({
  href,
  onClick,
  leading,
  trailing,
  tone,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  /** Coluna fixa à esquerda: avatar, ícone de tipo, marcador de estágio. */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Faixa de 2px na borda esquerda — usada para marcar risco/atraso. */
  tone?: "danger" | "warning" | "accent";
  className?: string;
  children: React.ReactNode;
}) {
  const faixa =
    tone === "danger" ? "before:bg-danger" : tone === "warning" ? "before:bg-warning" : "before:bg-brand-500";

  const conteudo = (
    <>
      {tone && (
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-0 left-0 w-[2px]", faixa.replace("before:", ""))}
        />
      )}
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing && <span className="flex shrink-0 items-center gap-2">{trailing}</span>}
      {(href || onClick) && (
        <Icon.ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity duration-120 group-hover/row:opacity-100" />
      )}
    </>
  );

  const classes = cn(
    "group/row relative flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 sm:px-5",
    (href || onClick) && "transition-colors duration-120 hover:bg-surface-sunken",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {conteudo}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {conteudo}
      </button>
    );
  }
  return <div className={classes}>{conteudo}</div>;
}

/** Estado vazio DENTRO de uma prancha — mantém a superfície contínua em vez
 *  de abrir um buraco com outra borda. */
export function BoardEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-small text-ink-3 sm:px-5">{children}</p>;
}
