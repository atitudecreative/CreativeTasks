"use client";

import { useMemo, useState } from "react";
import { cn } from "@/components/ui";
import { STAGE_META, STAGE_ORDER } from "@/lib/demandStages";
import type { ColunaMes } from "@/lib/demandSeries";
import { formatarMesCurto, formatarMesPorExtenso } from "@/lib/dates";

// O cálculo vive em lib/demandSeries (puro). Função exportada de um módulo
// "use client" não é a função quando um Server Component a importa — é uma
// referência ao cliente, e chamá-la derruba a renderização.
export type { ColunaMes } from "@/lib/demandSeries";

/* =========================================================================
   COMPOSIÇÃO POR MÊS
   -------------------------------------------------------------------------
   Colunas empilhadas: uma por mês de prazo, cada segmento um estágio.

   Por que esta forma: a aba Demandas já respondia "quanto tem em cada
   estágio" (os chips no topo) e "quanto vence em cada mês" (os grupos da
   lista). O que faltava era o CRUZAMENTO — em que estado está o trabalho
   de cada mês. É a diferença entre saber que há nove demandas com o
   ministério e ver que oito delas vencem no mês que vem.

   Empilhada e não agrupada porque os cinco estágios são partes de um todo
   (toda demanda está em exatamente um), e o total da coluna é uma leitura
   que interessa por si.

   Regras aplicadas: ordem fixa dos estágios (STAGE_ORDER, nunca ciclada);
   2px de superfície entre segmentos, para o empilhamento não virar um bloco
   contínuo; legenda sempre presente, porque com cinco séries a identidade
   não pode depender só da cor; e a mesma paleta de estágio já validada para
   daltonismo nos dois temas.
   ========================================================================= */

export function StageColumns({
  colunas,
  altura = 132,
  className,
}: {
  colunas: ColunaMes[];
  altura?: number;
  className?: string;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);

  const max = useMemo(() => Math.max(1, ...colunas.map((c) => c.total)), [colunas]);
  const usados = useMemo(
    () => STAGE_ORDER.filter((k) => colunas.some((c) => c.porEstagio[k] > 0)),
    [colunas]
  );

  if (colunas.length === 0) {
    return <p className="py-6 text-center text-small text-ink-3">Nenhuma demanda com prazo definido.</p>;
  }

  const detalhe = ativo ? colunas.find((c) => c.chave === ativo) : null;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="relative flex items-end gap-1.5" style={{ height: altura }}>
        {/* Referência de escala. Sem nenhuma marca, 6 e 5 são a mesma
            altura para quem só passa o olho. Uma linha só, no máximo — o
            resto sai no detalhe do hover. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 -translate-y-full pb-0.5 font-mono text-[0.625rem] tabular-nums text-ink-3"
        >
          {max}
        </span>
        {colunas.map((c) => {
          const alturaPct = (c.total / max) * 100;
          const destacado = ativo === c.chave;
          return (
            <button
              key={c.chave}
              type="button"
              onMouseEnter={() => setAtivo(c.chave)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(c.chave)}
              onBlur={() => setAtivo(null)}
              aria-label={`${formatarMesPorExtenso(c.chave)}: ${c.total} ${c.total === 1 ? "demanda" : "demandas"}`}
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {c.total === 0 ? (
                // Mês sem nenhuma demanda: um traço na base. Coluna de
                // altura zero desapareceria e o eixo mentiria sobre o
                // espaçamento entre os meses que existem.
                <span className="block h-[2px] w-full rounded-full bg-line" />
              ) : (
                // Ordem invertida no array (e não flex-col-reverse) para o
                // PRIMEIRO elemento do DOM ser o segmento de cima: é ele
                // que leva o arredondamento do topo, e com col-reverse o
                // `first:` caía no segmento de baixo.
                <span
                  className="flex w-full flex-col justify-start transition-opacity duration-120"
                  style={{ height: `${alturaPct}%`, opacity: ativo && !destacado ? 0.4 : 1 }}
                >
                  {[...STAGE_ORDER].reverse().map((k, idx, arr) => {
                    const v = c.porEstagio[k];
                    if (v === 0) return null;
                    const primeiroVisivel = arr.slice(0, idx).every((j) => c.porEstagio[j] === 0);
                    return (
                      <span
                        key={k}
                        className={cn(
                          "block w-full shrink-0",
                          primeiroVisivel ? "rounded-t-[3px]" : "border-t-2 border-surface"
                        )}
                        style={{
                          height: `${(v / c.total) * 100}%`,
                          backgroundColor: `rgb(var(${STAGE_META[k].cssVar}))`,
                        }}
                      />
                    );
                  })}
                </span>
              )}
              {/* O mês em curso ganha um traço na base: separa o que ainda
                  pode crescer do que já fechou. */}
              {c.emCurso && (
                <span aria-hidden="true" className="absolute -bottom-[3px] left-0 h-[2px] w-full rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-start gap-1.5 border-t border-line pt-1.5">
        {colunas.map((c) => (
          <span
            key={c.chave}
            className={cn(
              "min-w-0 flex-1 truncate text-center font-mono text-[0.625rem] uppercase tracking-[0.04em]",
              c.emCurso ? "text-brand-600" : c.futuro ? "text-ink-3" : "text-ink-3"
            )}
          >
            {formatarMesCurto(c.chave)}
          </span>
        ))}
      </div>

      {/* Legenda sempre presente: cinco séries não podem se distinguir só
          pela cor. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {usados.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-caption text-ink-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: `rgb(var(${STAGE_META[k].cssVar}))` }}
            />
            {STAGE_META[k].label}
          </span>
        ))}
      </div>

      <p className="mt-2 min-h-[1rem] text-caption text-ink-2">
        {detalhe ? (
          <>
            <span className="font-medium text-ink">{formatarMesPorExtenso(detalhe.chave)}</span>
            {detalhe.total === 0 ? (
              <> · nenhuma demanda com prazo neste mês</>
            ) : (
              <>
                {" · "}
                {usados
                  .filter((k) => detalhe.porEstagio[k] > 0)
                  .map((k) => `${detalhe.porEstagio[k]} ${STAGE_META[k].label.toLowerCase()}`)
                  .join(" · ")}
              </>
            )}
          </>
        ) : (
          <span className="text-ink-3">Passe o mouse por um mês para ver a composição.</span>
        )}
      </p>
    </div>
  );
}
