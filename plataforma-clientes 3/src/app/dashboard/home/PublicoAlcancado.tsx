"use client";

import { useState } from "react";
import { Tabs, Tooltip, cn } from "@/components/ui";
import { ChartDataTable, MUTED, seriesColor } from "@/components/charts/primitives";
import { formatByKey, formatMoney } from "@/lib/metricLanguage";
import type { FatiaPublico, Publico } from "@/lib/home";

/* =========================================================================
   PÚBLICO ALCANÇADO
   -------------------------------------------------------------------------
   A plataforma não tem dado por CANAL: a mídia paga é o Meta Ads, que
   entra sem separar Facebook de Instagram. A distribuição que existe de
   verdade é a de público — gênero e faixa etária —, e é ela que aparece
   aqui, em vez de uma divisão por canal que teria de ser inventada.

   Duas formas, cada uma pela natureza do dado:
   - Gênero: parte de um todo com duas ou três partes → uma barra 100%,
     com os números ao lado. Um donut diria o mesmo com mais tinta.
   - Idade: escala ordenada → barras na ordem das idades, uma cor só
     (é magnitude, não identidade), com a maior em destaque.

   O seletor troca a pergunta: onde a verba foi, ou de onde veio o
   resultado. O custo por resultado de cada faixa vai junto quando existe.
   ========================================================================= */

const GENERO_ROTULO: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  unknown: "Não informado",
  feminino: "Feminino",
  masculino: "Masculino",
};
// Mesma cor por gênero do relatório de campanha (slots fixos da paleta);
// "não informado" é ausência de dado, então vai para o cinza.
const GENERO_COR: Record<string, string> = {
  female: seriesColor(0),
  feminino: seriesColor(0),
  male: seriesColor(1),
  masculino: seriesColor(1),
  unknown: MUTED,
};

type Medida = "investimento" | "vendas";

function valorDe(f: FatiaPublico, m: Medida) {
  return m === "investimento" ? f.investimento : f.vendas ?? 0;
}
function pctDe(f: FatiaPublico, m: Medida) {
  return m === "investimento" ? f.pctInvestimento : f.pctVendas ?? 0;
}
function formatar(v: number, m: Medida) {
  return m === "investimento" ? formatMoney(v, true) : formatByKey("vendas", v);
}
function faixa(chave: string) {
  return /^\d+-\d+$/.test(chave) ? chave.replace("-", "–") : chave;
}

export function PublicoAlcancado({ publico }: { publico: Publico }) {
  const temVendas = publico.idade.some((f) => f.vendas != null) || publico.genero.some((f) => f.vendas != null);
  const [medida, setMedida] = useState<Medida>("investimento");
  const m: Medida = temVendas ? medida : "investimento";

  const idades = publico.idade;
  const maxIdade = Math.max(...idades.map((f) => valorDe(f, m)), 0);
  const topIdade = idades.reduce<FatiaPublico | null>((a, b) => (!a || valorDe(b, m) > valorDe(a, m) ? b : a), null);

  return (
    <div>
      {temVendas && (
        <Tabs<Medida>
          value={m}
          onChange={setMedida}
          tabs={[
            { value: "investimento", label: "Investimento" },
            { value: "vendas", label: "Resultados" },
          ]}
        />
      )}

      {publico.genero.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 font-mono text-label uppercase text-ink-3">Gênero</p>
          <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={publico.genero.map((g) => `${GENERO_ROTULO[g.chave] ?? g.chave} ${Math.round(pctDe(g, m))}%`).join(", ")}>
            {publico.genero.map((g) => (
              <span
                key={g.chave}
                className="h-full origin-left animate-bar-grow first:rounded-l-full last:rounded-r-full"
                style={{ width: `${Math.max(1, pctDe(g, m))}%`, backgroundColor: GENERO_COR[g.chave] ?? MUTED }}
              />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {publico.genero.map((g) => (
              <li key={g.chave} className="min-w-0">
                <span className="flex items-center gap-1.5 text-caption text-ink-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: GENERO_COR[g.chave] ?? MUTED }} aria-hidden="true" />
                  {GENERO_ROTULO[g.chave] ?? g.chave}
                </span>
                <span className="mt-0.5 block text-small">
                  <span className="font-semibold tabular-nums text-ink">{Math.round(pctDe(g, m))}%</span>
                  <span className="text-ink-3"> · {formatar(valorDe(g, m), m)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {idades.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 font-mono text-label uppercase text-ink-3">Faixa etária</p>
          <ul className="space-y-2.5">
            {idades.map((f) => {
              const v = valorDe(f, m);
              const destaque = topIdade?.chave === f.chave;
              return (
                <li key={f.chave}>
                  <Tooltip
                    className="block w-full"
                    content={
                      <>
                        {formatMoney(f.investimento, true)} investidos
                        {f.vendas != null && ` · ${formatByKey("vendas", f.vendas)} resultados`}
                        {f.cpa != null && ` · ${formatByKey("cpa", f.cpa)} por resultado`}
                      </>
                    }
                  >
                    <span tabIndex={0} className="grid w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-control outline-none focus-visible:shadow-focus">
                      <span className="font-mono text-caption tabular-nums text-ink-2">{faixa(f.chave)}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-neutral-soft">
                        <span
                          className="block h-full origin-left rounded-full animate-bar-grow"
                          style={{
                            width: `${maxIdade > 0 ? Math.max(2, (v / maxIdade) * 100) : 0}%`,
                            backgroundColor: destaque ? "rgb(var(--chart-1))" : "rgb(var(--chart-1) / 0.4)",
                          }}
                        />
                      </span>
                      <span className="whitespace-nowrap text-right text-caption tabular-nums">
                        <span className={cn("font-medium", destaque ? "text-ink" : "text-ink-2")}>{Math.round(pctDe(f, m))}%</span>
                        <span className="text-ink-3"> · {formatar(v, m)}</span>
                      </span>
                    </span>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ChartDataTable
        caption="Público alcançado"
        columns={["Grupo", "Investimento", "Resultados", "Custo por resultado"]}
        rows={[...publico.genero.map((g) => ({ ...g, nome: GENERO_ROTULO[g.chave] ?? g.chave })), ...idades.map((f) => ({ ...f, nome: `${faixa(f.chave)} anos` }))].map((f) => [
          f.nome,
          formatMoney(f.investimento),
          formatByKey("vendas", f.vendas),
          formatByKey("cpa", f.cpa),
        ])}
      />
    </div>
  );
}
