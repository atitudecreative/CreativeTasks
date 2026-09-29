import type { CampanhaPerfil, Faixa } from "./insights.ts";
import type { ResultadoPeriodo } from "./resultados.ts";

/* =========================================================================
   HOME — AGREGAÇÕES E INSIGHTS
   -------------------------------------------------------------------------
   Tudo o que a Home calcula e que não é o total por período (esse mora em
   lib/resultados.ts). Puro, como o resto da camada de leitura: sem
   Supabase e sem relógio, testável linha a linha.

   Três regras que valem para cada função daqui:
   1. Ausência é null, nunca zero. Semana sem rastreamento de conversão não
      é semana com zero resultado.
   2. Nada de média de razões. Custo por resultado e CTR saem sempre do
      agregado (soma ÷ soma).
   3. Insight só existe com base. Cada regra declara o mínimo de dados que
      exige; abaixo dele, não sai frase nenhuma.
   ========================================================================= */

/* ------------------------------------------------------------------------
   Série semanal
   ------------------------------------------------------------------------ */

export type LinhaSemanal = {
  campaignId: string;
  semanaInicio: string;
  semanaFim: string;
  investimento: number | null;
  impressoes: number | null;
  cliques: number | null;
  vendas: number | null;
};

export type PontoSemanal = {
  semanaInicio: string;
  semanaFim: string;
  investimento: number;
  impressoes: number | null;
  cliques: number | null;
  vendas: number | null;
  /** investimento ÷ resultados da semana; null sem resultado. */
  cpa: number | null;
  /** cliques ÷ impressões × 100; null sem impressão. */
  ctr: number | null;
};

function somaNula(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

/** Soma as campanhas do Meta semana a semana, só das campanhas dadas. */
export function serieSemanal(linhas: LinhaSemanal[], campanhas: Set<string>): PontoSemanal[] {
  const porSemana = new Map<string, PontoSemanal>();
  for (const l of linhas) {
    if (!campanhas.has(l.campaignId)) continue;
    const p = porSemana.get(l.semanaInicio);
    porSemana.set(l.semanaInicio, {
      semanaInicio: l.semanaInicio,
      semanaFim: p ? (l.semanaFim > p.semanaFim ? l.semanaFim : p.semanaFim) : l.semanaFim,
      investimento: (p?.investimento ?? 0) + (l.investimento ?? 0),
      impressoes: somaNula(p?.impressoes ?? null, l.impressoes),
      cliques: somaNula(p?.cliques ?? null, l.cliques),
      vendas: somaNula(p?.vendas ?? null, l.vendas),
      cpa: null,
      ctr: null,
    });
  }
  return Array.from(porSemana.values())
    .sort((a, b) => a.semanaInicio.localeCompare(b.semanaInicio))
    .map((p) => ({
      ...p,
      cpa: p.vendas != null && p.vendas > 0 ? p.investimento / p.vendas : null,
      ctr: p.impressoes != null && p.impressoes > 0 && p.cliques != null ? (p.cliques / p.impressoes) * 100 : null,
    }));
}

export type MetricaSerie = "investimento" | "vendas" | "cpa" | "impressoes" | "cliques" | "ctr";

/** Quais métricas têm pelo menos um valor na série — o seletor do
 *  gráfico só oferece estas. */
export function metricasDisponiveis(serie: PontoSemanal[]): MetricaSerie[] {
  const todas: MetricaSerie[] = ["investimento", "vendas", "cpa", "impressoes", "cliques", "ctr"];
  return todas.filter((m) => serie.some((p) => p[m] != null && (p[m] as number) > 0));
}

/** Valores de uma métrica para a sparkline do KPI. Semana sem dado vira
 *  null (lacuna), e não zero. */
export function valoresDa(serie: PontoSemanal[], m: MetricaSerie): (number | null)[] {
  return serie.map((p) => p[m]);
}

/* ------------------------------------------------------------------------
   Comparação semana a semana
   ------------------------------------------------------------------------
   Os dois períodos não caem nas mesmas semanas do calendário, então a
   comparação é por POSIÇÃO: a 1ª semana de mídia do período contra a 1ª
   semana de mídia do período anterior, a 2ª contra a 2ª. A tela diz isso
   com essas palavras. O período anterior mais longo é cortado no tamanho
   do atual — mostrar semanas "a mais" sem par não compara nada.
   ------------------------------------------------------------------------ */
export type PontoComparado = {
  indice: number;
  atual: PontoSemanal;
  anterior: PontoSemanal | null;
};

export function alinharComparacao(atual: PontoSemanal[], anterior: PontoSemanal[]): PontoComparado[] {
  return atual.map((p, i) => ({ indice: i, atual: p, anterior: anterior[i] ?? null }));
}

/* ------------------------------------------------------------------------
   Público (demografia do Meta Ads)
   ------------------------------------------------------------------------ */

export type LinhaDemografia = {
  campaignId: string;
  tipo: "genero" | "idade";
  chave: string;
  investimento: number | null;
  vendas: number | null;
};

export type FatiaPublico = {
  chave: string;
  investimento: number;
  vendas: number | null;
  /** Participação no investimento do recorte, 0–100. */
  pctInvestimento: number;
  /** Participação nos resultados, 0–100; null sem rastreamento. */
  pctVendas: number | null;
  cpa: number | null;
};

export type Publico = { genero: FatiaPublico[]; idade: FatiaPublico[] };

function fatias(linhas: LinhaDemografia[], ordenarPorChave: boolean): FatiaPublico[] {
  const porChave = new Map<string, { investimento: number; vendas: number | null }>();
  for (const l of linhas) {
    const a = porChave.get(l.chave);
    porChave.set(l.chave, {
      investimento: (a?.investimento ?? 0) + (l.investimento ?? 0),
      vendas: somaNula(a?.vendas ?? null, l.vendas),
    });
  }
  const totalInv = Array.from(porChave.values()).reduce((t, v) => t + v.investimento, 0);
  const comVendas = Array.from(porChave.values()).some((v) => v.vendas != null);
  const totalVendas = Array.from(porChave.values()).reduce((t, v) => t + (v.vendas ?? 0), 0);

  const lista = Array.from(porChave.entries()).map(([chave, v]) => ({
    chave,
    investimento: v.investimento,
    vendas: v.vendas,
    pctInvestimento: totalInv > 0 ? (v.investimento / totalInv) * 100 : 0,
    pctVendas: comVendas && totalVendas > 0 ? ((v.vendas ?? 0) / totalVendas) * 100 : null,
    cpa: v.vendas != null && v.vendas > 0 ? v.investimento / v.vendas : null,
  }));

  // Faixa etária lê na ordem das idades (18-24, 25-34...), não do maior
  // para o menor: é uma escala ordenada, e reordenar esconde a forma.
  return ordenarPorChave
    ? lista.sort((a, b) => a.chave.localeCompare(b.chave, "pt-BR", { numeric: true }))
    : lista.sort((a, b) => b.investimento - a.investimento);
}

export function publicoDoPeriodo(linhas: LinhaDemografia[], campanhas: Set<string>): Publico {
  const doRecorte = linhas.filter((l) => campanhas.has(l.campaignId));
  return {
    genero: fatias(doRecorte.filter((l) => l.tipo === "genero"), false),
    idade: fatias(doRecorte.filter((l) => l.tipo === "idade"), true),
  };
}

/* ------------------------------------------------------------------------
   Produção entregue, por tipo
   ------------------------------------------------------------------------ */

export type FatiaProducao = { chave: string; total: number; pct: number };

/** Conta por tipo. O tipo é texto livre (vem do cadastro ou do Asana),
 *  então não há lista fechada: vazio vira "sem-tipo", o resto conta como
 *  veio, sem diferenciar caixa nem espaço nas pontas. */
export function contarPorTipo(tipos: (string | null | undefined)[]): FatiaProducao[] {
  const conta = new Map<string, number>();
  for (const t of tipos) {
    const chave = t?.trim() ? t.trim().toLowerCase() : "sem-tipo";
    conta.set(chave, (conta.get(chave) ?? 0) + 1);
  }
  const total = tipos.length;
  return Array.from(conta.entries())
    .map(([chave, n]) => ({ chave, total: n, pct: total > 0 ? (n / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total || a.chave.localeCompare(b.chave));
}

/* ------------------------------------------------------------------------
   Insights
   ------------------------------------------------------------------------ */

export type TomInsight = "positivo" | "negativo" | "atencao" | "neutro";

export type Insight = {
  id: string;
  tom: TomInsight;
  /** Qual indicador o insight comenta — a tela escolhe o ícone por isto. */
  tema: "resultados" | "custo" | "alcance" | "investimento" | "semana" | "publico" | "orcamento" | "prazo" | "comparacao" | "rastreamento";
  texto: string;
  /** De onde vem o número — mostrado em letra pequena abaixo da frase. */
  base: string;
  href?: string;
};

export type EntradaInsights = {
  resultado: ResultadoPeriodo;
  rotuloAnterior: string;
  serie: PontoSemanal[];
  publico: Publico;
  orcamentos: { id: string; nome: string; orcamento: number; realizado: number }[];
  cpaMinisterio: number | null;
  cpaReferencia: Faixa | null;
};

const pct = (v: number) => `${Math.abs(Math.round(v))}%`;
const LIMIAR = 5; // variação abaixo disso é estabilidade, não notícia
const MIN_AMOSTRA_REFERENCIA = 4;

function dataCurta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function nomeFaixa(chave: string): string {
  return /^\d+-\d+$/.test(chave) ? `${chave.replace("-", " a ")} anos` : chave === "65+" ? "65 anos ou mais" : chave;
}

function top(perfis: CampanhaPerfil[], k: "investimento" | "vendas") {
  const com = perfis.filter((c) => c[k] != null && c[k]! > 0);
  const total = com.reduce((t, c) => t + c[k]!, 0);
  if (com.length < 2 || total <= 0) return null;
  const maior = com.reduce((a, b) => (b[k]! > a[k]! ? b : a));
  return { campanha: maior, share: (maior[k]! / total) * 100, n: com.length };
}

/**
 * Frases derivadas dos dados do período, na ordem em que interessam ao
 * cliente: o resultado, o custo, onde ele veio, e o que pede atenção.
 * Cada regra tem o seu piso de dados; nenhuma dispara sem ele.
 */
export function insightsDaHome(e: EntradaInsights): Insight[] {
  const out: Insight[] = [];
  const { resultado, rotuloAnterior } = e;
  const v = resultado.variacao;
  const nAtual = resultado.atual.eventos;
  const nAnt = resultado.anterior?.eventos ?? 0;
  const baseComparacao = `${nAtual} ${nAtual === 1 ? "campanha" : "campanhas"} no período contra ${nAnt} no anterior`;

  if (v.resultados != null && Math.abs(v.resultados) >= LIMIAR) {
    out.push({
      id: "var-resultados",
      tom: v.resultados > 0 ? "positivo" : "negativo",
      tema: "resultados",
      texto: `Os resultados ${v.resultados > 0 ? "cresceram" : "caíram"} ${pct(v.resultados)} em relação ${rotuloAnterior}.`,
      base: baseComparacao,
    });
  }

  if (v.custoPorResultado != null && Math.abs(v.custoPorResultado) >= LIMIAR) {
    out.push({
      id: "var-cpa",
      tom: v.custoPorResultado < 0 ? "positivo" : "negativo",
      tema: "custo",
      texto: `O custo por resultado ${v.custoPorResultado < 0 ? "caiu" : "subiu"} ${pct(v.custoPorResultado)} em relação ${rotuloAnterior}.`,
      base: baseComparacao,
    });
  }

  if (v.alcance != null && Math.abs(v.alcance) >= LIMIAR) {
    out.push({
      id: "var-alcance",
      tom: v.alcance > 0 ? "positivo" : "negativo",
      tema: "alcance",
      texto: `O alcance ${v.alcance > 0 ? "cresceu" : "diminuiu"} ${pct(v.alcance)} em relação ${rotuloAnterior}.`,
      base: baseComparacao,
    });
  }

  // De onde veio o resultado.
  const comVendas = resultado.campanhas.filter((c) => c.vendas != null);
  const topVendas = top(resultado.campanhas, "vendas");
  if (topVendas && topVendas.share >= 40) {
    out.push({
      id: "concentracao-resultados",
      tom: "neutro",
      tema: "resultados",
      texto: `${topVendas.campanha.nome} respondeu por ${pct(topVendas.share)} dos resultados do período.`,
      base: `entre ${topVendas.n} campanhas com conversão rastreada`,
      href: `/dashboard/campanhas/${topVendas.campanha.id}`,
    });
  } else if (comVendas.length === 1 && nAtual >= 3) {
    // Informação de verdade, e acionável: a maioria das campanhas não
    // mede conversão, então o total de resultados é o de UMA campanha.
    const sem = nAtual - 1;
    out.push({
      id: "rastreamento",
      tom: "atencao",
      tema: "rastreamento",
      texto: `Só ${comVendas[0].nome} mede conversões. As outras ${sem} campanhas do período não têm rastreamento, e ficam fora dos resultados.`,
      base: `${nAtual} campanhas no período`,
      href: `/dashboard/campanhas/${comVendas[0].id}`,
    });
  }

  const topInv = top(resultado.campanhas, "investimento");
  if (topInv && topInv.share >= 50) {
    out.push({
      id: "concentracao-investimento",
      tom: "neutro",
      tema: "investimento",
      texto: `${topInv.campanha.nome} recebeu ${pct(topInv.share)} do investimento do período.`,
      base: `entre ${topInv.n} campanhas com investimento`,
      href: `/dashboard/campanhas/${topInv.campanha.id}`,
    });
  }

  // A semana.
  const semanasComVendas = e.serie.filter((p) => p.vendas != null);
  if (semanasComVendas.length >= 3) {
    const ult = semanasComVendas.slice(-3);
    if (ult[0].vendas! < ult[1].vendas! && ult[1].vendas! < ult[2].vendas!) {
      out.push({
        id: "sequencia",
        tom: "positivo",
        tema: "semana",
        texto: `Os resultados cresceram por três semanas seguidas, chegando a ${Math.round(ult[2].vendas!).toLocaleString("pt-BR")} na semana de ${dataCurta(ult[2].semanaInicio)}.`,
        base: `${semanasComVendas.length} semanas com conversão rastreada`,
      });
    } else {
      const melhor = semanasComVendas.reduce((a, b) => (b.vendas! > a.vendas! ? b : a));
      out.push({
        id: "melhor-semana",
        tom: "neutro",
        tema: "semana",
        texto: `A melhor semana foi a de ${dataCurta(melhor.semanaInicio)}, com ${Math.round(melhor.vendas!).toLocaleString("pt-BR")} resultados.`,
        base: `${semanasComVendas.length} semanas com conversão rastreada`,
      });
    }
  }

  // Público: onde a verba se concentrou e onde ela rendeu mais.
  const idades = e.publico.idade;
  if (idades.length >= 2) {
    const maior = idades.reduce((a, b) => (b.pctInvestimento > a.pctInvestimento ? b : a));
    if (maior.pctInvestimento >= 30) {
      const extra =
        maior.pctVendas != null ? `, e trouxe ${pct(maior.pctVendas)} dos resultados` : "";
      out.push({
        id: "publico-concentracao",
        tom: "neutro",
        tema: "publico",
        texto: `O público de ${nomeFaixa(maior.chave)} recebeu ${pct(maior.pctInvestimento)} do investimento${extra}.`,
        base: `${idades.length} faixas etárias do Meta Ads`,
      });
    }
    const comCpa = idades.filter((f) => f.cpa != null);
    if (comCpa.length >= 2) {
      const barata = comCpa.reduce((a, b) => (b.cpa! < a.cpa! ? b : a));
      const cara = comCpa.reduce((a, b) => (b.cpa! > a.cpa! ? b : a));
      if (barata.chave !== cara.chave && cara.cpa! / barata.cpa! >= 1.1) {
        out.push({
          id: "publico-eficiencia",
          tom: "positivo",
          tema: "publico",
          texto: `A faixa de ${nomeFaixa(barata.chave)} teve o menor custo por resultado: ${barata.cpa!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, contra ${cara.cpa!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em ${nomeFaixa(cara.chave)}.`,
          base: `${comCpa.length} faixas com conversão rastreada`,
        });
      }
    }
  }

  // Contra os outros ministérios.
  if (e.cpaMinisterio != null && e.cpaReferencia && e.cpaReferencia.n >= MIN_AMOSTRA_REFERENCIA) {
    const d = ((e.cpaMinisterio - e.cpaReferencia.mediana) / e.cpaReferencia.mediana) * 100;
    if (Math.abs(d) >= 10) {
      out.push({
        id: "comparacao-ministerios",
        tom: d < 0 ? "positivo" : "atencao",
        tema: "comparacao",
        texto: `O custo por resultado típico deste ministério está ${pct(d)} ${d < 0 ? "abaixo" : "acima"} do das outras campanhas acompanhadas pela Comunicação.`,
        base: `mediana de ${e.cpaReferencia.n} campanhas de outros ministérios`,
      });
    }
  }

  // O que pede atenção.
  const estourado = e.orcamentos
    .map((o) => ({ ...o, pct: (o.realizado / o.orcamento) * 100 }))
    .filter((o) => o.pct > 105)
    .sort((a, b) => b.pct - a.pct)[0];
  if (estourado) {
    out.push({
      id: "orcamento",
      tom: "atencao",
      tema: "orcamento",
      texto: `${estourado.nome} já usou ${pct(estourado.pct)} do orçamento previsto.`,
      base: "orçamento aprovado (ou planejado) × investimento realizado",
      href: `/dashboard/campanhas/${estourado.id}`,
    });
  }

  const aferivel = resultado.campanhas.reduce((t, c) => t + c.demandasComPrazoAferivel, 0);
  const noPrazo = resultado.campanhas.reduce((t, c) => t + c.demandasNoPrazo, 0);
  if (aferivel >= 5) {
    const taxa = (noPrazo / aferivel) * 100;
    out.push({
      id: "prazo",
      tom: taxa >= 80 ? "positivo" : taxa < 60 ? "atencao" : "neutro",
      tema: "prazo",
      texto: `${pct(taxa)} das peças destas campanhas foram entregues no prazo combinado.`,
      base: `${aferivel} demandas com prazo e data de conclusão`,
    });
  }

  return out.slice(0, 6);
}
