// Import relativo COM extensão: este arquivo é puro e roda direto no
// `node --test`, que não conhece o alias "@/" (isso é do bundler). Mesmo
// motivo pelo qual carteira.ts importa "./insights.ts".
import { STAGE_ORDER, type StageKey } from "./demandStages.ts";

/* =========================================================================
   SÉRIE DE DEMANDAS POR MÊS E ESTÁGIO
   -------------------------------------------------------------------------
   Puro de propósito, num arquivo à parte do componente que o desenha.

   O motivo é uma regra do React Server Components que não perdoa: uma
   função exportada de um módulo marcado `"use client"` NÃO é a função
   quando importada por um Server Component — é uma referência ao cliente.
   Chamá-la de lá derruba a renderização com "N is not a function", e a
   mensagem em produção vem sem nenhuma pista do que aconteceu.

   Este cálculo é usado pelo Início (servidor) e pela aba Demandas
   (cliente), então mora aqui, onde os dois podem chamá-lo de verdade.
   ========================================================================= */

export type ColunaMes = {
  chave: string;
  porEstagio: Record<StageKey, number>;
  total: number;
  /** Mês corrente: o total ainda pode crescer. */
  emCurso: boolean;
  /** Mês no futuro: são prazos combinados, não trabalho realizado. */
  futuro: boolean;
};

function zerado(): Record<StageKey, number> {
  return { fila: 0, producao: 0, ministerio: 0, concluida: 0, parada: 0 };
}

export function agruparPorMesEEstagio(
  itens: { prazo: string | null; stage: StageKey }[],
  mesAtual: string
): ColunaMes[] {
  const mapa = new Map<string, Record<StageKey, number>>();
  for (const i of itens) {
    if (!i.prazo) continue;
    const chave = i.prazo.slice(0, 7);
    const atual = mapa.get(chave) ?? zerado();
    atual[i.stage] += 1;
    mapa.set(chave, atual);
  }
  if (mapa.size === 0) return [];

  // Preenche os meses vazios do intervalo: coluna que some faz fevereiro
  // encostar em maio e a inclinação mentir sobre o ritmo. O teto de 120
  // meses é guarda contra um prazo digitado errado (ano 2205) virar uma
  // série de milhares de colunas.
  const chaves = Array.from(mapa.keys()).sort();
  const meses: string[] = [];
  let atual = chaves[0];
  const fim = chaves[chaves.length - 1];
  while (atual <= fim && meses.length < 120) {
    meses.push(atual);
    const ano = +atual.slice(0, 4);
    const mes = +atual.slice(5, 7);
    atual = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
  }

  return meses.map((chave) => {
    const porEstagio = mapa.get(chave) ?? zerado();
    return {
      chave,
      porEstagio,
      total: STAGE_ORDER.reduce((s, k) => s + porEstagio[k], 0),
      emCurso: chave === mesAtual,
      futuro: chave > mesAtual,
    };
  });
}
