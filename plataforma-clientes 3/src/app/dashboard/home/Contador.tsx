"use client";

import { useEffect, useRef, useState } from "react";
import { formatCompact, formatMoney } from "@/lib/metricLanguage";

/* =========================================================================
   CONTADOR
   -------------------------------------------------------------------------
   O número sobe até o valor em ~0,7s quando o KPI aparece — uma vez. Não
   anima de novo ao rolar a página, só quando o VALOR muda (troca de
   período), e aí parte do número anterior, não do zero: o movimento mostra
   para que lado o indicador foi.

   Três cuidados:
   - Quem pediu menos movimento ao sistema (prefers-reduced-motion) vê o
     número pronto, sem animação.
   - Leitor de tela lê só o valor final (a contagem é aria-hidden). Um
     leitor anunciando "R$ 0, R$ 12 mil, R$ 380 mil..." seria inutilizável.
   - O HTML do servidor já traz o valor verdadeiro, escondido até o script
     assumir. Sem JavaScript, ou na impressão, o número certo aparece
     (ver .contador-pendente em globals.css). Nunca um zero provisório.
   ========================================================================= */

export type FormatoContador = "money-compact" | "money-precise" | "integer" | "compact";

function formatar(v: number, f: FormatoContador): string {
  switch (f) {
    case "money-compact":
      return formatMoney(v, true);
    case "money-precise":
      return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
    case "compact":
      return formatCompact(v);
    default:
      return Math.round(v).toLocaleString("pt-BR");
  }
}

const DURACAO = 700;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function Contador({ valor, formato }: { valor: number; formato: FormatoContador }) {
  const final = formatar(valor, formato);
  const [texto, setTexto] = useState(final);
  const [pronto, setPronto] = useState(false);
  const anterior = useRef<number | null>(null);

  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const de = anterior.current ?? 0;
    anterior.current = valor;
    setPronto(true);

    if (reduzido || de === valor) {
      setTexto(formatar(valor, formato));
      return;
    }

    // Primeiro quadro já no ponto de partida: sem isto, o valor final
    // piscaria por um quadro antes de a contagem começar.
    setTexto(formatar(de, formato));
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO);
      setTexto(formatar(de + (valor - de) * easeOut(t), formato));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, formato]);

  return (
    <>
      <span aria-hidden="true" className={pronto ? undefined : "contador-pendente"}>
        {texto}
      </span>
      <span className="sr-only">{final}</span>
    </>
  );
}
