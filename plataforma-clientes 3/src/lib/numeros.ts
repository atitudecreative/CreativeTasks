/* =========================================================================
   NÚMEROS DIGITADOS POR PESSOAS
   -------------------------------------------------------------------------
   O formulário de campanha lia dinheiro assim:

       const parsed = Number(value.replace(",", "."));
       return Number.isFinite(parsed) ? parsed : null;

   Troca a PRIMEIRA vírgula por ponto. Quem digita "1.234,56" — que é como
   se escreve dinheiro no Brasil — produz "1.234.56", que o Number() lê
   como NaN, que vira null. O campo era salvo VAZIO, sem erro, sem aviso: o
   orçamento aprovado da campanha simplesmente sumia, e só apareceria como
   problema semanas depois, num relatório onde o número não bate.

   Aqui os dois formatos são aceitos, e o que não é número vira uma recusa
   explícita — não um null silencioso que se confunde com "campo em branco".
   ========================================================================= */

export type Dinheiro =
  | { ok: true; valor: number | null }
  | { ok: false; motivo: string };

/**
 * Lê um valor monetário digitado. Campo em branco é `null` (ausência
 * legítima: "ainda não tem orçamento"), que é diferente de zero e diferente
 * de erro.
 */
export function lerDinheiro(bruto: unknown): Dinheiro {
  const texto = String(bruto ?? "").trim();
  if (!texto) return { ok: true, valor: null };

  // Tira símbolo de moeda e espaços (inclusive o não separável que o
  // toLocaleString produz e que volta num copiar-e-colar).
  const limpo = texto.replace(/R\$/gi, "").replace(/[\s  ]/g, "");

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normalizado: string;
  if (temVirgula && temPonto) {
    // "1.234,56" (pt-BR) ou "1,234.56" (en-US): o separador DECIMAL é o
    // que aparece por último.
    normalizado =
      limpo.lastIndexOf(",") > limpo.lastIndexOf(".")
        ? limpo.replace(/\./g, "").replace(",", ".")
        : limpo.replace(/,/g, "");
  } else if (temVirgula) {
    normalizado = limpo.replace(",", ".");
  } else {
    // Só pontos. "1.234" é ambíguo: pode ser mil duzentos e trinta e
    // quatro (milhar pt-BR) ou um inteiro com decimais. Decide pela forma:
    // grupos de exatamente três dígitos depois de cada ponto é milhar.
    normalizado = /^-?\d{1,3}(\.\d{3})+$/.test(limpo) ? limpo.replace(/\./g, "") : limpo;
  }

  if (!/^-?\d*\.?\d*$/.test(normalizado) || normalizado === "" || normalizado === "-") {
    return { ok: false, motivo: `"${texto}" não é um valor válido. Use algo como 1.234,56.` };
  }

  const n = Number(normalizado);
  if (!Number.isFinite(n)) {
    return { ok: false, motivo: `"${texto}" não é um valor válido. Use algo como 1.234,56.` };
  }
  if (n < 0) {
    return { ok: false, motivo: "Valor não pode ser negativo." };
  }

  // Centavos: o banco guarda numeric, mas não faz sentido gravar fração de
  // centavo vinda de um campo digitado.
  return { ok: true, valor: Math.round(n * 100) / 100 };
}

/**
 * Confere a ordem de um período. Data faltando não é erro — muita campanha
 * é cadastrada antes de ter data de término.
 */
export function periodoInvalido(
  inicio: string | null,
  termino: string | null
): string | null {
  if (!inicio || !termino) return null;
  // Formato "YYYY-MM-DD": comparar como texto já é comparar cronologia.
  if (inicio > termino) {
    return "A data de início é posterior à de término.";
  }
  return null;
}
