import {
  calcularFaixa,
  variacao,
  type CampanhaPerfil,
  type Faixa,
  MIN_AMOSTRA_FAIXA,
} from "./insights.ts";

/* =========================================================================
   VISÃO DE CARTEIRA
   -------------------------------------------------------------------------
   Agrega o perfil de campanha em duas leituras que os relatórios
   individuais não dão:

   - EMPRESA  (painel da Comunicação): quanto a carteira inteira investiu,
              qual a eficiência típica, quais clientes estão puxando pra
              cima e quais estão puxando pra baixo.
   - CLIENTE  (Início do ministério): como os eventos deste ministério
              evoluíram, e qual foi o melhor.

   Puro, como o motor de insights, e pelo mesmo motivo: o recorte de
   período e o "hoje" entram por parâmetro, então dá pra testar sem
   depender da data em que o teste roda.
   ========================================================================= */

export type ResumoMinisterio = {
  ministryId: string;
  eventos: number;
  investimento: number;
  /** Mediana de custo por resultado. null sem conversão rastreada. */
  cpaMediano: number | null;
  alcanceTotal: number | null;
  resultadosTotal: number | null;
  /** Variação de investimento contra o período anterior de mesma duração. */
  variacaoInvestimento: number | null;
  /** Variação de resultados contra o período anterior. */
  variacaoResultados: number | null;
};

export type ResumoCarteira = {
  eventos: number;
  ministerios: number;
  investimento: number;
  investimentoAnterior: number | null;
  variacaoInvestimento: number | null;
  resultados: number | null;
  resultadosAnteriores: number | null;
  variacaoResultados: number | null;
  /** Faixa de CPA da carteira — a referência de eficiência da empresa. */
  faixaCpa: Faixa | null;
  /** Ministérios ordenados por eficiência (menor CPA mediano primeiro).
   *  Só entram os que têm CPA calculável. */
  ranking: ResumoMinisterio[];
};

function soma(valores: (number | null)[]): number {
  return valores.reduce<number>((t, v) => t + (v ?? 0), 0);
}

/** Soma que devolve null quando NENHUM valor existe — diferente de zero.
 *  Sem rastreamento de conversão, "0 resultados" seria mentira. */
function somaOuNull(valores: (number | null)[]): number | null {
  const presentes = valores.filter((v): v is number => v != null);
  return presentes.length > 0 ? presentes.reduce((t, v) => t + v, 0) : null;
}

function mediana(valores: (number | null)[]): number | null {
  const limpos = valores.filter((v): v is number => v != null && Number.isFinite(v)).sort((a, b) => a - b);
  if (limpos.length === 0) return null;
  const meio = Math.floor(limpos.length / 2);
  return limpos.length % 2 ? limpos[meio] : (limpos[meio - 1] + limpos[meio]) / 2;
}

/** Campanhas dentro de uma janela de datas (inclusive nos dois extremos). */
export function noPeriodo(
  perfis: CampanhaPerfil[],
  inicio: string,
  fim: string
): CampanhaPerfil[] {
  return perfis.filter(
    (c) => c.dataReferencia != null && c.dataReferencia >= inicio && c.dataReferencia <= fim
  );
}

/** Janela anterior de mesma duração, para comparação período a período. */
export function periodoAnterior(inicio: string, fim: string): { inicio: string; fim: string } {
  const dIni = new Date(inicio + "T00:00:00Z");
  const dFim = new Date(fim + "T00:00:00Z");
  const duracao = dFim.getTime() - dIni.getTime();

  const fimAnterior = new Date(dIni.getTime() - 86400000);
  const inicioAnterior = new Date(fimAnterior.getTime() - duracao);

  return {
    inicio: inicioAnterior.toISOString().slice(0, 10),
    fim: fimAnterior.toISOString().slice(0, 10),
  };
}

export function resumirCarteira(
  perfis: CampanhaPerfil[],
  janela?: { inicio: string; fim: string }
): ResumoCarteira {
  const atuais = janela ? noPeriodo(perfis, janela.inicio, janela.fim) : perfis;

  let anteriores: CampanhaPerfil[] = [];
  if (janela) {
    const ant = periodoAnterior(janela.inicio, janela.fim);
    anteriores = noPeriodo(perfis, ant.inicio, ant.fim);
  }

  const investimento = soma(atuais.map((c) => c.investimento));
  const investimentoAnterior = janela ? soma(anteriores.map((c) => c.investimento)) : null;
  const resultados = somaOuNull(atuais.map((c) => c.vendas));
  const resultadosAnteriores = janela ? somaOuNull(anteriores.map((c) => c.vendas)) : null;

  // Agrupa por ministério.
  const porMinisterio = new Map<string, CampanhaPerfil[]>();
  for (const c of atuais) {
    if (!c.ministryId) continue;
    const lista = porMinisterio.get(c.ministryId) ?? [];
    lista.push(c);
    porMinisterio.set(c.ministryId, lista);
  }

  const anterioresPorMinisterio = new Map<string, CampanhaPerfil[]>();
  for (const c of anteriores) {
    if (!c.ministryId) continue;
    const lista = anterioresPorMinisterio.get(c.ministryId) ?? [];
    lista.push(c);
    anterioresPorMinisterio.set(c.ministryId, lista);
  }

  const ranking: ResumoMinisterio[] = Array.from(porMinisterio.entries()).map(([id, lista]) => {
    const ant = anterioresPorMinisterio.get(id) ?? [];
    const invAtual = soma(lista.map((c) => c.investimento));
    const resAtual = somaOuNull(lista.map((c) => c.vendas));

    return {
      ministryId: id,
      eventos: lista.length,
      investimento: invAtual,
      cpaMediano: mediana(lista.map((c) => c.cpa)),
      alcanceTotal: somaOuNull(lista.map((c) => c.alcance)),
      resultadosTotal: resAtual,
      variacaoInvestimento: ant.length > 0 ? variacao(invAtual, soma(ant.map((c) => c.investimento))) : null,
      variacaoResultados:
        ant.length > 0 ? variacao(resAtual, somaOuNull(ant.map((c) => c.vendas))) : null,
    };
  });

  return {
    eventos: atuais.length,
    ministerios: porMinisterio.size,
    investimento,
    investimentoAnterior,
    variacaoInvestimento: janela ? variacao(investimento, investimentoAnterior) : null,
    resultados,
    resultadosAnteriores,
    variacaoResultados: janela ? variacao(resultados, resultadosAnteriores) : null,
    faixaCpa: calcularFaixa(atuais.map((c) => c.cpa)),
    ranking: ranking
      .filter((r) => r.cpaMediano != null)
      .sort((a, b) => a.cpaMediano! - b.cpaMediano!),
  };
}

/* =========================================================================
   LEITURA DO MINISTÉRIO (Início)
   ========================================================================= */

export type LeituraMinisterio = {
  eventos: number;
  /** Evento com mais resultados; sem conversão rastreada, o de maior alcance. */
  melhorEvento: { nome: string; id: string; rotulo: string; valor: string } | null;
  /** Eficiência do ministério contra a faixa de todas as campanhas visíveis. */
  cpaMediano: number | null;
  cpaReferencia: Faixa | null;
  /** Investimento somado dos eventos do ministério. */
  investimento: number;
  /** Série cronológica pra sparkline: resultados por evento. */
  serieResultados: { nome: string; valor: number }[];
  /** true quando não há base pra afirmar nada — a tela precisa dizer. */
  dadosInsuficientes: boolean;
};

export function lerMinisterio(
  ministryId: string,
  perfis: CampanhaPerfil[]
): LeituraMinisterio {
  const doMinisterio = perfis
    .filter((c) => c.ministryId === ministryId)
    .sort((a, b) => (a.dataReferencia ?? "").localeCompare(b.dataReferencia ?? ""));

  const investimento = soma(doMinisterio.map((c) => c.investimento));

  // Melhor evento: prioriza resultado rastreado; sem isso, alcance. Nunca
  // inventa um critério quando nenhum dos dois existe.
  let melhorEvento: LeituraMinisterio["melhorEvento"] = null;
  const comVendas = doMinisterio.filter((c) => c.vendas != null);
  const comAlcance = doMinisterio.filter((c) => c.alcance != null);

  if (comVendas.length > 0) {
    const top = comVendas.reduce((a, b) => (b.vendas! > a.vendas! ? b : a));
    melhorEvento = {
      id: top.id,
      nome: top.nome,
      rotulo: "resultados",
      valor: Math.round(top.vendas!).toLocaleString("pt-BR"),
    };
  } else if (comAlcance.length > 0) {
    const top = comAlcance.reduce((a, b) => (b.alcance! > a.alcance! ? b : a));
    melhorEvento = {
      id: top.id,
      nome: top.nome,
      rotulo: "alcance",
      valor: Math.round(top.alcance!).toLocaleString("pt-BR"),
    };
  }

  return {
    eventos: doMinisterio.length,
    melhorEvento,
    cpaMediano: mediana(doMinisterio.map((c) => c.cpa)),
    // Referência: TODAS as campanhas visíveis, menos as deste ministério —
    // comparar o ministério com ele mesmo não diria nada.
    cpaReferencia: calcularFaixa(
      perfis.filter((c) => c.ministryId !== ministryId).map((c) => c.cpa)
    ),
    investimento,
    serieResultados: doMinisterio
      .filter((c) => c.vendas != null)
      .map((c) => ({ nome: c.nome, valor: c.vendas! })),
    dadosInsuficientes: doMinisterio.length < 2,
  };
}

export { MIN_AMOSTRA_FAIXA };
