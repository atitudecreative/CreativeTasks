"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon, cn } from "@/components/ui";
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
  legenda,
  children,
}: {
  periodo: PeriodoChave;
  /** Linha sob o filtro — com o quê o período está sendo comparado. */
  legenda?: React.ReactNode;
  /** Título e descrição da seção — ficam à esquerda do filtro, para que
   *  o filtro leia como "o recorte DESTA seção". */
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // O botão clicado acende na hora, com o indicador de carregamento; a
  // URL e os números acompanham quando o servidor responder.
  const [alvo, setAlvo] = useState<PeriodoChave | null>(null);

  function escolher(chave: PeriodoChave) {
    if (chave === periodo) return;
    const next = new URLSearchParams(params?.toString());
    next.set("periodo", chave);
    setAlvo(chave);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">{header}</div>
        <div className="flex max-w-full flex-col items-start gap-1.5 lg:items-end">
          <div
            role="group"
            aria-label="Período analisado"
            data-print="hide"
            className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-control border border-line bg-surface p-0.5 shadow-xs"
          >
            {PERIODOS.map((p) => {
              const ativo = pending && alvo ? p.chave === alvo : p.chave === periodo;
              return (
                <button
                  key={p.chave}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => escolher(p.chave)}
                  className={cn(
                    "flex min-h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-3 text-caption font-medium",
                    "transition-[background-color,color,box-shadow] duration-180 ease-snap",
                    ativo ? "bg-ink text-ink-inverse shadow-xs" : "text-ink-3 hover:bg-neutral-soft hover:text-ink-2"
                  )}
                >
                  {ativo && pending && <Icon.Loader className="h-3 w-3 animate-spin" />}
                  {p.rotulo}
                </button>
              );
            })}
          </div>
          {legenda && <div className="text-caption text-ink-3">{legenda}</div>}
        </div>
      </div>
      <div
        aria-busy={pending}
        className={cn("mt-6 transition-opacity duration-180", pending && "pointer-events-none opacity-50")}
      >
        {children}
      </div>
    </div>
  );
}
