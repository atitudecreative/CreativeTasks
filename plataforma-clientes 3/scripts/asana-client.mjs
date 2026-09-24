/* =========================================================================
   CLIENTE DO ASANA — paginação, limite de taxa e nova tentativa
   -------------------------------------------------------------------------
   Separado do sync de propósito: o diagnóstico (diagnostico-asana.mjs) e a
   sincronização (sync-asana.mjs) precisam falar com a API exatamente do
   mesmo jeito. Se o diagnóstico usasse um cliente diferente, ele
   responderia sobre um mundo que não é o que o cron vê.

   O QUE ESTE ARQUIVO CONSERTA
   ---------------------------
   O sync fazia `fetch()` cru, sem nada entre ele e a API:

   1. SEM CONTROLE DE TAXA. `collectTaskTree` chama /subtasks para CADA
      tarefa — inclusive folhas, que nunca têm filhas. Num projeto com
      1.500 tarefas são 1.500 requisições disparadas o mais rápido que o
      laço consegue. O limite do Asana é 150/min no plano gratuito e
      1.500/min nos pagos: a rajada estoura em segundos.

   2. SEM NOVA TENTATIVA. Quando estourava, a resposta 429 virava uma
      exceção. No laço de subtarefas ela caía num `catch` que registrava
      "Pulando essa ramificação" e seguia — ou seja, um limite de taxa era
      tratado como se fosse um problema do dado, e um galho inteiro da
      árvore sumia sem que ninguém percebesse. Na paginação do projeto era
      pior: a exceção subia e o ministério inteiro era pulado.

   O Asana manda `Retry-After` no cabeçalho do 429. Respeitar esse número é
   a diferença entre esperar o tempo certo e martelar a API até ela
   desistir da gente.
   ========================================================================= */

// A base é fixa em produção; a variável de ambiente existe para apontar os
// testes de fumaça (ver scripts/qa) para um Asana de mentira, sem tocar na
// API de verdade.
const ASANA_API = process.env.ASANA_API_BASE ?? "https://app.asana.com/api/1.0";

/** Pausa mínima entre requisições. O Asana permite 150/min no plano
 *  gratuito (uma a cada 400ms) e 1.500/min nos pagos (uma a cada 40ms).
 *  O padrão fica no meio: 120ms ≈ 500/min, folgado para o plano pago e
 *  seguro o bastante para não disparar rajada. Ajustável por env var. */
const PAUSA_MS = Number(process.env.ASANA_MIN_INTERVAL_MS ?? 120);

const MAX_TENTATIVAS = Number(process.env.ASANA_MAX_RETRIES ?? 5);

/** Base da espera exponencial quando não há `Retry-After` para obedecer.
 *  Configurável para o teste não ficar parado segundos à toa. */
const BASE_ESPERA_MS = Number(process.env.ASANA_BACKOFF_BASE_MS ?? 1000);

let ultimaChamada = 0;

function dormir(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Contadores da rodada — é o que vira o relatório no fim do cron. */
export const contadores = {
  requisicoes: 0,
  paginas: 0,
  esperasPorLimite: 0,
  novasTentativas: 0,
  msEsperando: 0,
};

export function zerarContadores() {
  for (const k of Object.keys(contadores)) contadores[k] = 0;
}

/**
 * Uma requisição ao Asana, com espaçamento mínimo e nova tentativa em
 * 429 e 5xx. Devolve o JSON já decodificado.
 *
 * Erro 4xx que não seja 429 NÃO é repetido: 401 (token), 403 (permissão) e
 * 404 (gid errado) não melhoram com insistência, e repetir só esconde a
 * causa atrás de cinco tentativas iguais.
 *
 * `lista: false` para os endpoints que devolvem UM objeto (ex:
 * /tasks/{gid}) em vez de uma coleção.
 */
export async function asanaFetch(url, { token, rotulo = "", lista = true } = {}) {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const desde = Date.now() - ultimaChamada;
    if (desde < PAUSA_MS) {
      const espera = PAUSA_MS - desde;
      contadores.msEsperando += espera;
      await dormir(espera);
    }
    ultimaChamada = Date.now();
    contadores.requisicoes++;

    let res;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      // Falha de rede: vale tentar de novo.
      if (tentativa === MAX_TENTATIVAS) {
        throw new Error(`Rede falhou em ${rotulo || url} após ${tentativa} tentativas: ${err.message}`);
      }
      contadores.novasTentativas++;
      await dormir(Math.min(2 ** tentativa * (BASE_ESPERA_MS / 2), 15000));
      continue;
    }

    if (res.ok) {
      const json = await res.json();
      // `data` ausente é resposta inesperada, não lista vazia. Antes o
      // código fazia `push(...json.data)` e estourava com "not iterable"
      // — uma mensagem que não diz nada sobre o que aconteceu.
      if (!json || (lista ? !Array.isArray(json.data) : json.data == null)) {
        throw new Error(
          `Asana respondeu 200 sem lista em ${rotulo || url}: ${JSON.stringify(json).slice(0, 300)}`
        );
      }
      return json;
    }

    const corpo = await res.text();

    if (res.status === 429) {
      // O Asana diz em quantos segundos pode voltar. Respeitar isso é o
      // que faz a espera ser a espera certa.
      const retryAfter = Number(res.headers.get("retry-after"));
      const espera = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(2 ** tentativa * BASE_ESPERA_MS, 30000);
      contadores.esperasPorLimite++;
      contadores.msEsperando += espera;
      if (tentativa === MAX_TENTATIVAS) {
        throw new Error(`Limite de taxa do Asana em ${rotulo || url} mesmo após ${tentativa} tentativas.`);
      }
      console.warn(
        `  (limite de taxa do Asana em ${rotulo || "requisição"} — esperando ${Math.round(espera / 1000)}s, tentativa ${tentativa}/${MAX_TENTATIVAS})`
      );
      await dormir(espera);
      continue;
    }

    if (res.status >= 500) {
      if (tentativa === MAX_TENTATIVAS) {
        throw new Error(`Asana retornou ${res.status} em ${rotulo || url} após ${tentativa} tentativas: ${corpo.slice(0, 300)}`);
      }
      contadores.novasTentativas++;
      await dormir(Math.min(2 ** tentativa * BASE_ESPERA_MS, 20000));
      continue;
    }

    // 4xx que não é 429: não adianta repetir.
    throw new Error(`Asana retornou ${res.status} em ${rotulo || url}: ${corpo.slice(0, 300)}`);
  }
  throw new Error(`Esgotadas as tentativas em ${rotulo || url}.`);
}

/**
 * Percorre TODAS as páginas de um endpoint de coleção do Asana.
 *
 * A paginação já estava certa no sync — este helper existe para ela ficar
 * num lugar só, contada (quantas páginas foram mesmo consultadas é uma das
 * perguntas que o diagnóstico precisa responder) e impossível de esquecer
 * na próxima chamada que alguém escrever.
 */
export async function asanaPaginado(caminho, { token, optFields, limit = 100, params = {}, rotulo = "" } = {}) {
  const itens = [];
  let offset;
  let paginas = 0;

  do {
    const url = new URL(`${ASANA_API}${caminho}`);
    if (optFields) url.searchParams.set("opt_fields", optFields);
    url.searchParams.set("limit", String(limit));
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
    if (offset) url.searchParams.set("offset", offset);

    const json = await asanaFetch(url, { token, rotulo: rotulo || caminho });
    itens.push(...json.data);
    paginas++;
    contadores.paginas++;
    offset = json.next_page?.offset;
  } while (offset);

  return { itens, paginas };
}

export { ASANA_API };
