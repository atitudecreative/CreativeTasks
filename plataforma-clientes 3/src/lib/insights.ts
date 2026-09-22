/* =========================================================================
   MOTOR DE INSIGHTS
   -------------------------------------------------------------------------
   Transforma perfil de campanha em leitura. Puro: sem Supabase, sem
   next/headers, sem data "de agora" — tudo entra por parâmetro. É o que
   permite testar cada regra isoladamente (ver insights.test.ts).

   TRÊS REGRAS DE HONESTIDADE, que valem acima de qualquer outra coisa:

   1. NÃO INVENTAR. Nenhuma regra dispara sem os dados que ela exige.
      Faltou base, não sai insight — e a tela diz "dados insuficientes"
      em vez de mostrar uma conclusão bonita e sem lastro.

   2. MEDIANA E QUARTIL, NUNCA MÉDIA. Uma única campanha com verba
      desproporcional destrói uma média e faz todo o resto parecer ruim.
      A faixa p25–p75 é o que responde de verdade "quanto costuma ser".

   3. TODO INSIGHT CARREGA O N. "12% acima da média" sem dizer média de
      quantos é retórica. Aqui cada insight leva `baseAmostra` e a
      interface mostra.
   ========================================================================= */

export type CampanhaPerfil = {
  id: string;
  ministryId: string | null;
  nome: string;
  tipo: string;
  fase: string;
  saude: string;
  dataReferencia: string | null;

  orcamentoPlanejado: number | null;
  orcamentoAprovado: number | null;
  investimento: number | null;

  alcance: number | null;
  impressoes: number | null;
  cliques: number | null;
  vendas: number | null;

  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;

  demandasTotal: number;
  demandasConcluidas: number;
  demandasComPrazoAferivel: number;
  demandasNoPrazo: number;
  cicloMedianoDias: number | null;

  entregasTotal: number;
  progressoMarcos: number | null;
};

export type Faixa = {
  /** Quantas campanhas entraram no cálculo (NUNCA incluindo a analisada). */
  n: number;
  p25: number;
  mediana: number;
  p75: number;
  min: number;
  max: number;
};

export type InsightTipo =
  | "eficiencia"
  | "performance"
  | "oportunidade"
  | "alerta"
  | "anomalia"
  | "tendencia"
  | "financeiro"
  | "operacional";

export type InsightSeveridade = "positivo" | "neutro" | "atencao" | "critico";

export type Insight = {
  /** Estável, pra key de lista e pra teste. */
  id: string;
  tipo: InsightTipo;
  severidade: InsightSeveridade;
  titulo: string;
  descricao: string;
  /** Quantas campanhas sustentam a afirmação. null = não é comparativo. */
  baseAmostra: number | null;
  /** Rótulo do que está sendo comparado, pra tela explicar a referência. */
  referencia?: string;
};

/* =========================================================================
   ESTATÍSTICA
   ========================================================================= */

/** Mínimo de campanhas COMPARÁVEIS pra uma faixa significar alguma coisa.
 *  Abaixo disso o quartil é ruído, e o certo é não afirmar nada. */
export const MIN_AMOSTRA_FAIXA = 4;

/** Diferença relativa mínima pra virar insight. Abaixo disso é oscilação
 *  normal, e apontar como achado seria criar alarme falso. */
const DIFERENCA_MINIMA = 0.1;

/** Percentil por interpolação linear — o mesmo método do percentile_cont
 *  do Postgres, pra número calculado aqui bater com número calculado lá. */
export function percentil(valoresOrdenados: number[], p: number): number {
  if (valoresOrdenados.length === 0) return NaN;
  if (valoresOrdenados.length === 1) return valoresOrdenados[0];

  const pos = (valoresOrdenados.length - 1) * p;
  const baixo = Math.floor(pos);
  const alto = Math.ceil(pos);
  if (baixo === alto) return valoresOrdenados[baixo];
  return valoresOrdenados[baixo] + (valoresOrdenados[alto] - valoresOrdenados[baixo]) * (pos - baixo);
}

/** Faixa de referência a partir de uma lista de valores.
 *  Devolve null quando não há amostra suficiente — quem chama tem que
 *  lidar com isso, e é de propósito: não existe faixa "aproximada". */
export function calcularFaixa(valores: (number | null | undefined)[]): Faixa | null {
  const limpos = valores
    .filter((v): v is number => v != null && Number.isFinite(v))
    .sort((a, b) => a - b);

  if (limpos.length < MIN_AMOSTRA_FAIXA) return null;

  return {
    n: limpos.length,
    p25: percentil(limpos, 0.25),
    mediana: percentil(limpos, 0.5),
    p75: percentil(limpos, 0.75),
    min: limpos[0],
    max: limpos[limpos.length - 1],
  };
}

/** Variação relativa de `valor` contra `base`, em %. null sem base. */
export function variacao(valor: number | null, base: number | null): number | null {
  if (valor == null || base == null || base === 0) return null;
  return ((valor - base) / Math.abs(base)) * 100;
}

function pct(v: number): string {
  return `${Math.abs(v).toFixed(0)}%`;
}

/* Percentual com casa decimal em pt-BR (vírgula). toFixed() escreve com
   PONTO — e a mesma tela mostrava "R$ 12.641,75" e "3.00%" um ao lado do
   outro. Este módulo é puro de propósito (sem nenhum import), então tem o
   seu próprio formatador em vez de puxar o de lib/metricLanguage. */
function formatarPercentual(v: number, casas: number): string {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function numero(v: number): string {
  return Math.round(v).toLocaleString("pt-BR");
}

/* =========================================================================
   SELEÇÃO DE COMPARÁVEIS
   ========================================================================= */

/** Campanhas comparáveis à analisada: mesmo TIPO, excluindo ela mesma.
 *  Comparar um evento com um lançamento não diz nada — são operações de
 *  natureza diferente, com verba e ciclo diferentes. */
export function comparaveis(alvo: CampanhaPerfil, universo: CampanhaPerfil[]): CampanhaPerfil[] {
  return universo.filter((c) => c.id !== alvo.id && c.tipo === alvo.tipo);
}

/** Campanhas anteriores do MESMO ministério, da mais recente pra mais
 *  antiga. Sem data de referência a campanha fica de fora: não dá pra
 *  dizer que veio antes. */
export function historicoDoMinisterio(
  alvo: CampanhaPerfil,
  universo: CampanhaPerfil[]
): CampanhaPerfil[] {
  if (!alvo.ministryId || !alvo.dataReferencia) return [];
  return universo
    .filter(
      (c) =>
        c.id !== alvo.id &&
        c.ministryId === alvo.ministryId &&
        c.dataReferencia != null &&
        c.dataReferencia < alvo.dataReferencia!
    )
    .sort((a, b) => (b.dataReferencia! < a.dataReferencia! ? -1 : 1));
}

/* =========================================================================
   REGRAS
   -------------------------------------------------------------------------
   Cada uma é uma função pequena que devolve um Insight ou null. Ficam
   separadas de propósito: uma regra errada é fácil de achar, de testar e
   de desligar sem mexer nas outras.
   ========================================================================= */

type ChaveMetrica = "cpa" | "ctr" | "cpc" | "cpm" | "alcance" | "vendas";

const METRICA_META: Record<
  ChaveMetrica,
  { nome: string; menorEhMelhor: boolean; formata: (v: number) => string }
> = {
  cpa: { nome: "custo por resultado", menorEhMelhor: true, formata: moeda },
  cpc: { nome: "custo por clique", menorEhMelhor: true, formata: moeda },
  cpm: { nome: "custo por mil exibições", menorEhMelhor: true, formata: moeda },
  ctr: { nome: "taxa de cliques", menorEhMelhor: false, formata: (v) => formatarPercentual(v, 2) },
  alcance: { nome: "alcance", menorEhMelhor: false, formata: numero },
  vendas: { nome: "resultados", menorEhMelhor: false, formata: numero },
};

/** Posição da campanha dentro da faixa dos eventos semelhantes. */
function regraQuartil(
  alvo: CampanhaPerfil,
  chave: ChaveMetrica,
  faixa: Faixa | null
): Insight | null {
  const valor = alvo[chave];
  if (valor == null || faixa == null) return null;

  const meta = METRICA_META[chave];
  const delta = variacao(valor, faixa.mediana);
  if (delta == null || Math.abs(delta) < DIFERENCA_MINIMA * 100) return null;

  const acimaDaMediana = valor > faixa.mediana;
  const ehBom = meta.menorEhMelhor ? !acimaDaMediana : acimaDaMediana;

  // Só vira destaque quando sai da faixa central (p25–p75). Dentro dela,
  // por mais que a variação contra a mediana pareça grande, a campanha
  // está no comportamento normal do grupo.
  const foraDaFaixa = valor < faixa.p25 || valor > faixa.p75;
  if (!foraDaFaixa) return null;

  const direcao = acimaDaMediana ? "acima" : "abaixo";

  return {
    id: `quartil-${chave}`,
    tipo: ehBom ? "oportunidade" : "alerta",
    severidade: ehBom ? "positivo" : "atencao",
    titulo: ehBom
      ? `${meta.nome[0].toUpperCase()}${meta.nome.slice(1)} entre os melhores`
      : `${meta.nome[0].toUpperCase()}${meta.nome.slice(1)} fora do usual`,
    descricao:
      `${meta.formata(valor)} — ${pct(delta)} ${direcao} da mediana de eventos do mesmo tipo ` +
      `(${meta.formata(faixa.p25)} a ${meta.formata(faixa.p75)} é a faixa usual).`,
    baseAmostra: faixa.n,
    referencia: "eventos do mesmo tipo",
  };
}

/** Investimento subiu muito mais que o retorno (ou o contrário). */
function regraAnomaliaInvestimentoRetorno(
  alvo: CampanhaPerfil,
  anterior: CampanhaPerfil | undefined
): Insight | null {
  if (!anterior) return null;
  if (alvo.investimento == null || anterior.investimento == null) return null;
  if (alvo.vendas == null || anterior.vendas == null) return null;
  if (anterior.investimento <= 0 || anterior.vendas <= 0) return null;

  const varInv = variacao(alvo.investimento, anterior.investimento)!;
  const varRet = variacao(alvo.vendas, anterior.vendas)!;

  // Verba cresceu de forma relevante e o retorno não acompanhou nem um
  // terço disso.
  if (varInv >= 20 && varRet < varInv / 3) {
    return {
      id: "anomalia-investimento-retorno",
      tipo: "anomalia",
      severidade: varRet < 0 ? "critico" : "atencao",
      titulo: "Investimento cresceu mais que o retorno",
      descricao:
        `Contra ${anterior.nome}, o investimento subiu ${pct(varInv)} e os resultados ` +
        `${varRet >= 0 ? `subiram apenas ${pct(varRet)}` : `caíram ${pct(varRet)}`}.`,
      baseAmostra: 1,
      referencia: "campanha anterior deste ministério",
    };
  }

  // Gastou menos (ou o mesmo) e manteve o retorno.
  if (varInv <= -10 && varRet >= -5) {
    return {
      id: "eficiencia-investimento-retorno",
      tipo: "eficiencia",
      severidade: "positivo",
      titulo: "Mesmo resultado com menos verba",
      descricao:
        `Contra ${anterior.nome}, o investimento caiu ${pct(varInv)} e os resultados ` +
        `${varRet >= 0 ? `ainda subiram ${pct(varRet)}` : `recuaram só ${pct(varRet)}`}.`,
      baseAmostra: 1,
      referencia: "campanha anterior deste ministério",
    };
  }

  return null;
}

/** Orçamento aprovado x realizado. */
function regraOrcamento(alvo: CampanhaPerfil): Insight | null {
  const { orcamentoAprovado: aprovado, investimento } = alvo;
  if (aprovado == null || aprovado <= 0 || investimento == null) return null;

  const uso = (investimento / aprovado) * 100;

  if (uso > 105) {
    return {
      id: "orcamento-estouro",
      tipo: "financeiro",
      severidade: uso > 120 ? "critico" : "atencao",
      titulo: "Investimento acima do aprovado",
      descricao:
        `Foram investidos ${moeda(investimento)} sobre ${moeda(aprovado)} aprovados — ` +
        `${pct(uso - 100)} a mais (${moeda(investimento - aprovado)}).`,
      baseAmostra: null,
    };
  }

  // Sobra só interessa quando a campanha já acabou; no meio do caminho
  // "usou 40% da verba" é só o andamento normal.
  const encerrada = alvo.saude === "concluida" || alvo.fase === "encerramento_aprendizado";
  if (encerrada && uso < 70) {
    return {
      id: "orcamento-sobra",
      tipo: "financeiro",
      severidade: "neutro",
      titulo: "Sobrou verba aprovada",
      descricao:
        `A campanha encerrou usando ${pct(uso)} do aprovado — ` +
        `${moeda(aprovado - investimento)} não foram investidos.`,
      baseAmostra: null,
    };
  }

  return null;
}

/** Sequência de crescimento no histórico do ministério. */
function regraTendencia(alvo: CampanhaPerfil, historico: CampanhaPerfil[]): Insight | null {
  // Do mais antigo pro mais novo, terminando na campanha analisada.
  const serie = [...historico].reverse().concat(alvo).filter((c) => c.vendas != null);
  if (serie.length < 3) return null;

  // Estritamente crescente. Um "quase crescente" não é tendência — é
  // oscilação, e chamar de tendência seria vender ruído como padrão.
  const crescente = serie.every((c, i) => i === 0 || c.vendas! > serie[i - 1].vendas!);
  if (!crescente) return null;

  const primeiro = serie[0].vendas!;
  const ultimo = serie[serie.length - 1].vendas!;
  const total = variacao(ultimo, primeiro);

  return {
    id: "tendencia-crescimento",
    tipo: "tendencia",
    severidade: "positivo",
    titulo: `Crescimento em ${serie.length} eventos seguidos`,
    descricao:
      `Os resultados subiram a cada evento deste ministério, de ${numero(primeiro)} para ` +
      `${numero(ultimo)}${total != null ? ` (${pct(total)} no total)` : ""}.`,
    baseAmostra: serie.length,
    referencia: "histórico deste ministério",
  };
}

/** Melhor marca do ministério em alcance ou resultados. */
function regraRecorde(alvo: CampanhaPerfil, historico: CampanhaPerfil[]): Insight | null {
  if (historico.length < 2) return null;

  for (const chave of ["vendas", "alcance"] as const) {
    const valor = alvo[chave];
    if (valor == null) continue;

    const anteriores = historico.map((c) => c[chave]).filter((v): v is number => v != null);
    if (anteriores.length < 2) continue;

    const melhorAnterior = Math.max(...anteriores);
    if (valor > melhorAnterior) {
      const meta = METRICA_META[chave];
      const delta = variacao(valor, melhorAnterior);
      return {
        id: `recorde-${chave}`,
        tipo: "performance",
        severidade: "positivo",
        titulo: `Recorde de ${meta.nome} deste ministério`,
        descricao:
          `${meta.formata(valor)} — supera o recorde anterior de ${meta.formata(melhorAnterior)}` +
          `${delta != null ? ` em ${pct(delta)}` : ""}.`,
        baseAmostra: anteriores.length + 1,
        referencia: "histórico deste ministério",
      };
    }
  }

  return null;
}

/** Pontualidade das entregas contra os eventos semelhantes. */
function regraPontualidade(alvo: CampanhaPerfil, faixa: Faixa | null): Insight | null {
  // Menos de 5 demandas com prazo aferível não sustenta um percentual.
  if (alvo.demandasComPrazoAferivel < 5) return null;

  const taxa = (alvo.demandasNoPrazo / alvo.demandasComPrazoAferivel) * 100;

  if (faixa == null) {
    // Sem grupo de comparação ainda dá pra apontar o caso extremo, que
    // não depende de referência nenhuma pra ser relevante.
    if (taxa < 60) {
      return {
        id: "pontualidade-baixa",
        tipo: "operacional",
        severidade: "atencao",
        titulo: "Entregas fora do prazo",
        descricao:
          `${alvo.demandasNoPrazo} de ${alvo.demandasComPrazoAferivel} demandas com prazo ` +
          `foram entregues em dia (${pct(taxa)}).`,
        baseAmostra: null,
      };
    }
    return null;
  }

  const delta = variacao(taxa, faixa.mediana);
  if (delta == null || Math.abs(delta) < DIFERENCA_MINIMA * 100) return null;
  if (taxa >= faixa.p25 && taxa <= faixa.p75) return null;

  const bom = taxa > faixa.mediana;
  return {
    id: "pontualidade",
    tipo: "operacional",
    severidade: bom ? "positivo" : "atencao",
    titulo: bom ? "Entregas mais pontuais que o usual" : "Entregas menos pontuais que o usual",
    descricao:
      `${pct(taxa)} das demandas com prazo saíram em dia — ${pct(delta)} ` +
      `${bom ? "acima" : "abaixo"} da mediana de eventos do mesmo tipo (${pct(faixa.mediana)}).`,
    baseAmostra: faixa.n,
    referencia: "eventos do mesmo tipo",
  };
}

/* =========================================================================
   ORQUESTRAÇÃO
   ========================================================================= */

const ORDEM_SEVERIDADE: Record<InsightSeveridade, number> = {
  critico: 0,
  atencao: 1,
  positivo: 2,
  neutro: 3,
};

export type ResultadoInsights = {
  insights: Insight[];
  /** Quantas campanhas do mesmo tipo sustentaram as comparações. */
  amostraComparavel: number;
  /** true quando não houve base pra nenhuma comparação — a tela precisa
   *  dizer isso em vez de simplesmente não mostrar nada. */
  dadosInsuficientes: boolean;
};

export function gerarInsights(
  alvo: CampanhaPerfil,
  universo: CampanhaPerfil[]
): ResultadoInsights {
  const pares = comparaveis(alvo, universo);
  const historico = historicoDoMinisterio(alvo, universo);
  const anterior = historico[0];

  const faixaDe = (f: (c: CampanhaPerfil) => number | null) => calcularFaixa(pares.map(f));

  const taxaPontualidade = (c: CampanhaPerfil) =>
    c.demandasComPrazoAferivel >= 5 ? (c.demandasNoPrazo / c.demandasComPrazoAferivel) * 100 : null;

  const candidatos = [
    regraQuartil(alvo, "cpa", faixaDe((c) => c.cpa)),
    regraQuartil(alvo, "ctr", faixaDe((c) => c.ctr)),
    regraQuartil(alvo, "cpm", faixaDe((c) => c.cpm)),
    regraQuartil(alvo, "alcance", faixaDe((c) => c.alcance)),
    regraAnomaliaInvestimentoRetorno(alvo, anterior),
    regraOrcamento(alvo),
    regraTendencia(alvo, historico),
    regraRecorde(alvo, historico),
    regraPontualidade(alvo, calcularFaixa(pares.map(taxaPontualidade))),
  ];

  const insights = candidatos
    .filter((i): i is Insight => i !== null)
    .sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]);

  return {
    insights,
    amostraComparavel: pares.length,
    dadosInsuficientes: insights.length === 0 && pares.length < MIN_AMOSTRA_FAIXA,
  };
}


/* =========================================================================
   COMPARAÇÃO PARA A INTERFACE
   -------------------------------------------------------------------------
   Monta as linhas do painel "este evento contra eventos semelhantes".
   Fica aqui, e não no componente, porque é a mesma estatística que
   alimenta os insights — se divergisse, a tela diria uma coisa e o texto
   do insight outra.
   ========================================================================= */

export type LinhaComparacao = {
  chave: ChaveMetrica;
  nome: string;
  menorEhMelhor: boolean;
  valor: number;
  valorFormatado: string;
  faixa: Faixa;
  faixaFormatada: { p25: string; mediana: string; p75: string; min: string; max: string };
  /** Posição do valor dentro de min–max, em % — para o marcador na régua.
   *  Limitada a 0–100: valor fora do intervalo encosta na ponta em vez de
   *  sair do desenho. */
  posicaoPct: number;
  /** Onde o p25–p75 começa e termina na mesma régua. */
  faixaInicioPct: number;
  faixaFimPct: number;
  /** Variação contra a mediana, em %. */
  deltaMediana: number | null;
  /** true quando o valor está fora da faixa usual E é o lado bom. */
  destaque: "bom" | "ruim" | null;
};

const ORDEM_COMPARACAO: ChaveMetrica[] = ["cpa", "ctr", "cpm", "cpc", "alcance", "vendas"];

export function construirComparacoes(
  alvo: CampanhaPerfil,
  universo: CampanhaPerfil[]
): LinhaComparacao[] {
  const pares = comparaveis(alvo, universo);

  return ORDEM_COMPARACAO.flatMap((chave) => {
    const valor = alvo[chave];
    if (valor == null) return [];

    const faixa = calcularFaixa(pares.map((c) => c[chave]));
    if (!faixa) return [];

    const meta = METRICA_META[chave];
    const span = faixa.max - faixa.min;

    // Todas as campanhas com o mesmo valor: régua sem largura. Aí o
    // marcador vai pro meio e a faixa ocupa tudo — desenhar qualquer
    // outra coisa seria inventar dispersão que não existe.
    const posicao = (v: number) => (span <= 0 ? 50 : ((v - faixa.min) / span) * 100);
    const limita = (v: number) => Math.max(0, Math.min(100, v));

    const deltaMediana = variacao(valor, faixa.mediana);
    const foraDaFaixa = valor < faixa.p25 || valor > faixa.p75;
    const acima = valor > faixa.mediana;
    const ehBom = meta.menorEhMelhor ? !acima : acima;

    return [
      {
        chave,
        nome: meta.nome,
        menorEhMelhor: meta.menorEhMelhor,
        valor,
        valorFormatado: meta.formata(valor),
        faixa,
        faixaFormatada: {
          p25: meta.formata(faixa.p25),
          mediana: meta.formata(faixa.mediana),
          p75: meta.formata(faixa.p75),
          min: meta.formata(faixa.min),
          max: meta.formata(faixa.max),
        },
        posicaoPct: limita(posicao(valor)),
        faixaInicioPct: limita(posicao(faixa.p25)),
        faixaFimPct: limita(posicao(faixa.p75)),
        deltaMediana,
        destaque: foraDaFaixa ? (ehBom ? "bom" : "ruim") : null,
      },
    ];
  });
}
