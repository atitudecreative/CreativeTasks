import { variacao, type CampanhaPerfil } from "./insights.ts";

/* =========================================================================
   RESULTADOS POR PERÍODO (Início do ministério)
   -------------------------------------------------------------------------
   O Início respondia "como está o trabalho hoje" (demandas abertas,
   prazos) e deixava para o fim da página — e sem recorte de tempo — a
   pergunta que o cliente de fato traz: "qual foi o resultado do que foi
   feito?". Este módulo responde isso para uma janela escolhida, contra a
   janela anterior de mesma duração.

   Puro, como o motor de insights e a carteira: sem Supabase, sem relógio.
   "Hoje" e o período entram por parâmetro, então dá para testar.

   Regras de honestidade herdadas do resto da camada de dados:
   - Soma sem nenhum valor presente é null ("não sei"), não zero.
   - Variação só existe quando há base anterior diferente de zero.
   - Custo por resultado é recalculado do agregado (investimento das
     campanhas COM resultado ÷ resultados), nunca a média dos CPAs — média
     de razões dá peso igual a uma campanha de R$ 200 e a uma de R$ 20 mil.
   ========================================================================= */

export type PeriodoChave = "90d" | "180d" | "12m" | "tudo";

export const PERIODOS: { chave: PeriodoChave; rotulo: string; dias: number | null }[] = [
  { chave: "90d", rotulo: "3 meses", dias: 90 },
  { chave: "180d", rotulo: "6 meses", dias: 180 },
  { chave: "12m", rotulo: "12 meses", dias: 365 },
  { chave: "tudo", rotulo: "Tudo", dias: null },
];

export const PERIODO_PADRAO: PeriodoChave = "12m";

export function lerPeriodo(bruto: unknown): PeriodoChave {
  const v = Array.isArray(bruto) ? bruto[0] : bruto;
  return PERIODOS.some((p) => p.chave === v) ? (v as PeriodoChave) : PERIODO_PADRAO;
}

function somaDiasIso(data: string, dias: number): string {
  const d = new Date(data + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export type Janela = {
  /** Primeiro dia da janela atual (inclusive). null = desde sempre. */
  inicio: string | null;
  /** Janela anterior de mesma duração, [inicio, fim) — null em "tudo". */
  anterior: { inicio: string; fim: string } | null;
};

/**
 * A janela atual NÃO tem fim: vai do início até o futuro. Campanha em
 * andamento tem data de referência adiante (é a data do evento), e é
 * justamente a que está gastando agora — cortar em "hoje" tiraria do
 * resultado o que mais importa para o cliente.
 */
export function janelaDoPeriodo(chave: PeriodoChave, hojeIso: string): Janela {
  const def = PERIODOS.find((p) => p.chave === chave)!;
  if (def.dias == null) return { inicio: null, anterior: null };
  const inicio = somaDiasIso(hojeIso, -def.dias + 1);
  return {
    inicio,
    anterior: { inicio: somaDiasIso(inicio, -def.dias), fim: inicio },
  };
}

export type Agregado = {
  eventos: number;
  /** null quando nenhuma campanha tem investimento lançado. */
  investimento: number | null;
  alcance: number | null;
  impressoes: number | null;
  cliques: number | null;
  resultados: number | null;
  custoPorResultado: number | null;
  ctr: number | null;
  /** Quantas campanhas do recorte têm alguma mídia (alcance ou impressão). */
  comMidia: number;
};

function somaOuNull(valores: (number | null)[]): number | null {
  const presentes = valores.filter((v): v is number => v != null && Number.isFinite(v));
  return presentes.length > 0 ? presentes.reduce((t, v) => t + v, 0) : null;
}

export function agregar(perfis: CampanhaPerfil[]): Agregado {
  const investimento = somaOuNull(perfis.map((c) => c.investimento));
  const impressoes = somaOuNull(perfis.map((c) => c.impressoes));
  const cliques = somaOuNull(perfis.map((c) => c.cliques));
  const resultados = somaOuNull(perfis.map((c) => c.vendas));

  const comResultado = perfis.filter((c) => c.vendas != null && c.vendas > 0 && c.investimento != null);
  const investComResultado = comResultado.reduce((t, c) => t + (c.investimento ?? 0), 0);
  const resultadosComInvest = comResultado.reduce((t, c) => t + (c.vendas ?? 0), 0);

  // CTR só entre campanhas que têm as DUAS medidas; cliques de uma e
  // impressões de outra não formam taxa nenhuma.
  const comAmbos = perfis.filter((c) => c.impressoes != null && c.impressoes > 0 && c.cliques != null);
  const imprAmbos = comAmbos.reduce((t, c) => t + (c.impressoes ?? 0), 0);
  const cliqAmbos = comAmbos.reduce((t, c) => t + (c.cliques ?? 0), 0);

  return {
    eventos: perfis.length,
    investimento,
    alcance: somaOuNull(perfis.map((c) => c.alcance)),
    impressoes,
    cliques,
    resultados,
    custoPorResultado: resultadosComInvest > 0 ? investComResultado / resultadosComInvest : null,
    ctr: imprAmbos > 0 ? (cliqAmbos / imprAmbos) * 100 : null,
    comMidia: perfis.filter((c) => c.alcance != null || c.impressoes != null).length,
  };
}

export type ResultadoPeriodo = {
  periodo: PeriodoChave;
  janela: Janela;
  atual: Agregado;
  /** null em "tudo" — não há período anterior a "desde sempre". */
  anterior: Agregado | null;
  variacao: {
    investimento: number | null;
    alcance: number | null;
    resultados: number | null;
    custoPorResultado: number | null;
  };
  /** Campanhas do recorte, da mais recente para a mais antiga. */
  campanhas: CampanhaPerfil[];
};

function dentro(data: string | null, inicio: string | null, fim?: string): boolean {
  if (inicio == null) return true;
  if (data == null) return false;
  return data >= inicio && (fim == null || data < fim);
}

export function resultadoDoPeriodo(
  perfis: CampanhaPerfil[],
  periodo: PeriodoChave,
  hojeIso: string
): ResultadoPeriodo {
  const janela = janelaDoPeriodo(periodo, hojeIso);

  const campanhas = perfis
    .filter((c) => dentro(c.dataReferencia, janela.inicio))
    .sort((a, b) => (b.dataReferencia ?? "").localeCompare(a.dataReferencia ?? ""));

  const atual = agregar(campanhas);
  const anterior = janela.anterior
    ? agregar(perfis.filter((c) => dentro(c.dataReferencia, janela.anterior!.inicio, janela.anterior!.fim)))
    : null;

  // Sem nenhum evento no período anterior, "variação" seria contra o
  // vazio: não há o que comparar, e a seta não aparece.
  const comparavel = anterior != null && anterior.eventos > 0;

  return {
    periodo,
    janela,
    atual,
    anterior,
    variacao: {
      investimento: comparavel ? variacao(atual.investimento, anterior!.investimento) : null,
      alcance: comparavel ? variacao(atual.alcance, anterior!.alcance) : null,
      resultados: comparavel ? variacao(atual.resultados, anterior!.resultados) : null,
      custoPorResultado: comparavel ? variacao(atual.custoPorResultado, anterior!.custoPorResultado) : null,
    },
    campanhas,
  };
}

/** Quantos itens caem na janela atual e na anterior, pela data dada. Serve
 *  para demandas concluídas (data_conclusao) e arquivos (data_entrega). */
export function contarNoPeriodo(
  datas: (string | null | undefined)[],
  janela: Janela
): { atual: number; anterior: number | null; variacao: number | null } {
  const atual = datas.filter((d) => dentro(d ?? null, janela.inicio)).length;
  if (!janela.anterior) return { atual, anterior: null, variacao: null };
  const anterior = datas.filter((d) => dentro(d ?? null, janela.anterior!.inicio, janela.anterior!.fim)).length;
  return { atual, anterior, variacao: anterior > 0 ? variacao(atual, anterior) : null };
}

/* -------------------------------------------------------------------------
   MANCHETE
   -------------------------------------------------------------------------
   Uma frase que diz o que os quatro números dizem juntos — a leitura que o
   cliente faria sozinho se soubesse onde olhar. Só sai quando há base para
   ela (período anterior com evento e as duas variações calculáveis); fora
   disso, null, e a tela não mostra frase nenhuma. Variação abaixo de 5%
   é tratada como estabilidade: dizer "subiu 2%" é vender ruído.
   ------------------------------------------------------------------------- */
function intensidade(v: number): "estavel" | "subiu" | "caiu" {
  if (Math.abs(v) < 5) return "estavel";
  return v > 0 ? "subiu" : "caiu";
}

function pctBr(v: number): string {
  return `${Math.abs(Math.round(v))}%`;
}

export function manchete(r: ResultadoPeriodo, rotuloAnterior: string): string | null {
  const vr = r.variacao.resultados;
  const vi = r.variacao.investimento;
  if (vr == null || vi == null) return null;

  const res = intensidade(vr);
  const inv = intensidade(vi);

  const frRes =
    res === "estavel"
      ? "Os resultados ficaram estáveis"
      : `Os resultados ${res === "subiu" ? "cresceram" : "caíram"} ${pctBr(vr)}`;
  const frInv =
    inv === "estavel"
      ? "com investimento praticamente igual"
      : `com investimento ${pctBr(vi)} ${inv === "subiu" ? "maior" : "menor"}`;

  let fecho = "";
  if (res === "subiu" && (inv === "estavel" || inv === "caiu")) fecho = " — mais retorno por real investido.";
  else if (res === "subiu" && inv === "subiu" && vr > vi) fecho = " — o retorno cresceu mais que a verba.";
  else if ((res === "caiu" || res === "estavel") && inv === "subiu") fecho = " — a verba subiu sem o retorno acompanhar.";
  else if (res === "caiu" && inv === "caiu" && Math.abs(vr) <= Math.abs(vi)) fecho = " — queda proporcional à verba.";
  else fecho = ".";

  return `${frRes} ${frInv} em relação ${rotuloAnterior}${fecho}`;
}
