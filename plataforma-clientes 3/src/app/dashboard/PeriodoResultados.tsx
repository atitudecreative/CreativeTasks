"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui";
import { PERIODOS, type PeriodoChave } from "@/lib/resultados";

/* =========================================================================
   FILTRO DE PERÍODO DOS RESULTADOS
   -------------------------------------------------------------------------
   O período vive na URL (?periodo=90d): dá para mandar o link para alguém
   e ele abre no mesmo recorte, e o voltar do navegador desfaz a troca.

   A troca é feita dentro de uma transição. Sem isso, o Next mostraria o
   esqueleto da página inteira (loading.tsx) a cada clique; assim o
   conteúdo atual fica na tela, esmaecido, até o novo chegar — e fica
   claro que o filtro age sobre ESTE bloco, não sobre a página toda.
   ========================================================================= */

export function PeriodoResultados({
  periodo,
  header,
  children,
}: {
  periodo: PeriodoChave;
  /** Título e descrição da seção — ficam à esquerda do filtro, para que
   *  o filtro leia como "o recorte DESTA seção". */
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function escolher(chave: PeriodoChave) {
    if (chave === periodo) return;
    const next = new URLSearchParams(params?.toString());
    next.set("periodo", chave);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">{header}</div>
        <div
          role="group"
          aria-label="Período dos resultados"
          data-print="hide"
          className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-control bg-neutral-soft p-0.5"
        >
          {PERIODOS.map((p) => {
            const ativo = p.chave === periodo;
            return (
              <button
                key={p.chave}
                type="button"
                aria-pressed={ativo}
                onClick={() => escolher(p.chave)}
                className={cn(
                  "flex min-h-8 shrink-0 items-center rounded-[6px] px-3 text-caption font-medium",
                  "transition-[background-color,color,box-shadow] duration-180 ease-snap",
                  ativo ? "bg-surface text-ink shadow-xs" : "text-ink-3 hover:text-ink-2"
                )}
              >
                {p.rotulo}
              </button>
            );
          })}
        </div>
      </div>
      <div
        aria-busy={pending}
        className={cn("mt-4 transition-opacity duration-180", pending && "pointer-events-none opacity-50")}
      >
        {children}
      </div>
    </div>
  );
}
