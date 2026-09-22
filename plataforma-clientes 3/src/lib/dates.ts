/* =========================================================================
   DATAS — um "hoje" só, no fuso de quem usa a plataforma
   -------------------------------------------------------------------------
   O problema que isto resolve é real e silencioso. A plataforma rodava
   "hoje" assim:

       new Date(prazo) < new Date(new Date().toDateString())

   Duas armadilhas numa linha só:

   1. `new Date("2026-03-15")` — string de data pura — é interpretada como
      meia-noite em UTC. Já `new Date("Sun Mar 15 2026")` (o que
      toDateString() devolve) é meia-noite LOCAL. A comparação misturava
      os dois relógios.

   2. "Local" é o fuso do SERVIDOR, não o de quem usa. Em produção o Node
      roda em UTC, e Brasília é UTC-3. Das 21h às 23h59 de todo dia, o
      servidor já virou a data e o Brasil não — uma demanda que vence hoje
      aparecia como ATRASADA três horas antes de atrasar, todo santo dia.

   Numa plataforma de prestação de contas, "atrasada" é o sinal mais caro
   que existe: é o que a agência mostra pro cliente. Errar por três horas
   por dia não é detalhe.

   A saída aqui é tratar data-sem-hora como o que ela é: TEXTO no formato
   YYYY-MM-DD. Nesse formato a ordem alfabética é a ordem cronológica, então
   comparar é comparar string — sem parse, sem fuso, sem hora. O único
   ponto que precisa saber de fuso é descobrir que dia é hoje em Brasília,
   e isso o Intl resolve sem ambiguidade.
   ========================================================================= */

export const TIMEZONE = "America/Sao_Paulo";

// "en-CA" porque é o locale cujo formato numérico curto já é YYYY-MM-DD —
// evita remontar a string a partir das partes.
const ISO_NO_FUSO = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data de hoje em Brasília, como "YYYY-MM-DD". */
export function hoje(agora: Date = new Date()): string {
  return ISO_NO_FUSO.format(agora);
}

/**
 * Normaliza o que vem do banco para "YYYY-MM-DD".
 *
 * Colunas `date` do Postgres chegam como "2026-03-15" e passam direto.
 * Colunas `timestamptz` chegam como "2026-03-15T23:30:00+00:00" — aí o
 * corte precisa ser feito NO FUSO DE BRASÍLIA, senão 20h30 do dia 15 em
 * Brasília (23h30 UTC) vira dia 15 e 21h30 vira dia 16.
 */
export function comoDataLocal(valor: string | null | undefined): string | null {
  if (!valor) return null;
  // Data pura: já está no formato certo e não tem hora pra converter.
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return ISO_NO_FUSO.format(d);
}

/** `a` é estritamente anterior a `b`? Ambas em "YYYY-MM-DD". */
export function anteriorA(a: string, b: string): boolean {
  return a < b;
}

/** Já passou? (estritamente antes de hoje em Brasília) */
export function jaPassou(data: string | null | undefined, referencia: string = hoje()): boolean {
  const d = comoDataLocal(data);
  return d != null && d < referencia;
}

/** Quantos dias inteiros separam duas datas "YYYY-MM-DD" (b - a). */
export function diasEntre(a: string, b: string): number {
  // Meio-dia UTC nas duas pontas: fica longe das bordas do dia, então
  // nenhum horário de verão histórico consegue empurrar a conta pra 23h
  // ou 25h e quebrar o arredondamento.
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10), 12)
    - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10), 12);
  return Math.round(ms / 86400000);
}

/** Soma (ou subtrai, com número negativo) dias a uma data "YYYY-MM-DD". */
export function somaDias(data: string, dias: number): string {
  const base = Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), 12);
  const d = new Date(base + dias * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------
   Formatação para leitura
   -------------------------------------------------------------------------
   Todas montam a data com Date.UTC(...) a partir das partes da string e
   formatam com timeZone UTC. É o jeito de garantir que "2026-03-15" seja
   exibido como 15/03 em qualquer servidor — formatar uma data pura no fuso
   local é justamente o que faz um dia 1 virar dia 30 do mês anterior.
   ------------------------------------------------------------------------- */

function comoUTC(data: string): Date {
  return new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10)));
}

/** "15/03" */
export function formatarDiaMes(valor: string | null | undefined, vazio = "sem prazo"): string {
  const d = comoDataLocal(valor);
  if (!d) return vazio;
  return comoUTC(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
}

/** "15/03/2026" */
export function formatarDataCompleta(valor: string | null | undefined, vazio = "—"): string {
  const d = comoDataLocal(valor);
  if (!d) return vazio;
  return comoUTC(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** "Março de 2026", a partir de uma chave "YYYY-MM". */
export function formatarMesPorExtenso(chave: string): string {
  const d = new Date(Date.UTC(+chave.slice(0, 4), +chave.slice(5, 7) - 1, 1));
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "Mar/26", a partir de uma chave "YYYY-MM". */
export function formatarMesCurto(chave: string): string {
  const d = new Date(Date.UTC(+chave.slice(0, 4), +chave.slice(5, 7) - 1, 1));
  const bruto = d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");
  return `${bruto.charAt(0).toUpperCase()}${bruto.slice(1)}/${chave.slice(2, 4)}`;
}
