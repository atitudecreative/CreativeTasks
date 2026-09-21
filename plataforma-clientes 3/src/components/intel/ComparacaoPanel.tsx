import { Icon, Tooltip, EmptyState, cn } from "@/components/ui";
import type { LinhaComparacao } from "@/lib/insights";

/* =========================================================================
   COMPARAÇÃO CONTRA EVENTOS SEMELHANTES
   -------------------------------------------------------------------------
   Uma régua por métrica. A forma é um "bullet": faixa de referência ao
   fundo, mediana como marca, e o valor deste evento como marcador.

   Por que régua e não gráfico de barras comparando eventos um a um: o
   que importa aqui não é "quanto cada evento fez", é "onde ESTE cai em
   relação ao normal". Barra lado a lado com 12 eventos vira um gráfico
   para ser decifrado; a régua responde na primeira olhada.

   Decisões de leitura:
   - A faixa p25–p75 é desenhada como área, não como linha: ela é um
     intervalo, e intervalo se lê como área.
   - O marcador tem forma própria (barra vertical) além da cor, e o valor
     aparece em número ao lado. Ninguém depende de enxergar a cor.
   - `menorEhMelhor` inverte só a interpretação, nunca a escala — a régua
     sempre cresce da esquerda pra direita, senão o usuário teria que
     lembrar qual métrica está espelhada.
   ========================================================================= */

function Regua({ linha }: { linha: LinhaComparacao }) {
  const { faixaInicioPct, faixaFimPct, posicaoPct, destaque } = linha;

  const corMarcador =
    destaque === "bom" ? "bg-success" : destaque === "ruim" ? "bg-danger" : "bg-ink";

  // Mediana na mesma régua. Sem span (todos os valores iguais) ela fica
  // no meio, junto do marcador — coerente com o que posicaoPct faz.
  const span = linha.faixa.max - linha.faixa.min;
  const medianaPct = span <= 0 ? 50 : ((linha.faixa.mediana - linha.faixa.min) / span) * 100;

  return (
    <div className="relative h-6" role="img" aria-label={
      `${linha.nome}: ${linha.valorFormatado}. Faixa usual dos eventos semelhantes de ` +
      `${linha.faixaFormatada.p25} a ${linha.faixaFormatada.p75}, mediana ${linha.faixaFormatada.mediana}.`
    }>
      {/* trilho: intervalo inteiro observado */}
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-neutral-soft" />

      {/* faixa usual (p25–p75) */}
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-strong"
        style={{ left: `${faixaInicioPct}%`, width: `${Math.max(faixaFimPct - faixaInicioPct, 1)}%` }}
      />

      {/* mediana */}
      <div
        className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-ink-3"
        style={{ left: `${medianaPct}%` }}
      />

      {/* este evento — anel na cor da superfície pra separar do trilho
          quando cai exatamente em cima da mediana */}
      <div
        className={cn(
          "absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface",
          corMarcador
        )}
        style={{ left: `${posicaoPct}%` }}
      />
    </div>
  );
}

export function ComparacaoPanel({ linhas }: { linhas: LinhaComparacao[] }) {
  if (linhas.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Icon.BarChart className="h-4 w-4" />}
        title="Ainda não há base de comparação"
        description="A comparação aparece quando houver pelo menos 4 eventos publicados do mesmo tipo, com a métrica preenchida."
      />
    );
  }

  return (
    <div className="divide-y divide-line">
      {linhas.map((l) => (
        <div key={l.chave} className="py-3 first:pt-0 last:pb-0">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="flex items-baseline gap-2">
              <span className="text-small font-medium text-ink first-letter:uppercase">{l.nome}</span>
              <Tooltip
                content={
                  l.menorEhMelhor
                    ? "Nesta métrica, quanto menor melhor."
                    : "Nesta métrica, quanto maior melhor."
                }
              >
                <span className="cursor-help font-mono text-[0.625rem] uppercase text-ink-3">
                  {l.menorEhMelhor ? "menor melhor" : "maior melhor"}
                </span>
              </Tooltip>
            </span>

            <span className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-small font-semibold tabular-nums",
                  l.destaque === "bom" ? "text-success" : l.destaque === "ruim" ? "text-danger" : "text-ink"
                )}
              >
                {l.valorFormatado}
              </span>
              {l.deltaMediana != null && Math.abs(l.deltaMediana) >= 1 && (
                <span className="text-caption tabular-nums text-ink-3">
                  {l.deltaMediana > 0 ? "+" : "−"}
                  {Math.abs(l.deltaMediana).toFixed(0)}% vs. mediana
                </span>
              )}
            </span>
          </div>

          <Regua linha={l} />

          <div className="mt-1 flex items-baseline justify-between gap-2 font-mono text-[0.625rem] text-ink-3">
            <span>{l.faixaFormatada.min}</span>
            <span className="text-ink-2">
              faixa usual {l.faixaFormatada.p25} – {l.faixaFormatada.p75}
            </span>
            <span>{l.faixaFormatada.max}</span>
          </div>
        </div>
      ))}

      <p className="pt-3 text-caption text-ink-3">
        A faixa usual é o intervalo onde caem metade dos eventos do mesmo tipo (do 25º ao 75º
        percentil), calculada sobre {linhas[0].faixa.n}{" "}
        {linhas[0].faixa.n === 1 ? "evento" : "eventos"}.
      </p>
    </div>
  );
}
