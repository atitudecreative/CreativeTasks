/* =========================================================================
   MONTAGEM DA ÁRVORE DE TAREFAS DO ASANA
   -------------------------------------------------------------------------
   Separado do sync porque é aqui que mora a decisão que fazia tarefas
   sumirem do portal — e decisão que faz tarefa sumir precisa de teste
   (ver asana-arvore.test.mjs). Nada aqui fala com a rede: quem busca
   subtarefa é a função passada por parâmetro.
   ========================================================================= */

// Trava de segurança: uma hierarquia de subtarefas do Asana não deveria
// nunca chegar nem perto disso, mas evita que um dado estranho (um ciclo,
// por exemplo) trave a sincronização inteira.
export const PROFUNDIDADE_MAXIMA = 15;

/**
 * Separa a listagem de um quadro em tarefas de topo e subtarefas órfãs.
 *
 * `/projects/{gid}/tasks` devolve tudo que é card do quadro — inclusive
 * subtarefas que alguém arrastou para o quadro como card independente.
 * O sync descartava TODAS as que tivessem `parent`, com o raciocínio de
 * que elas entrariam depois pela varredura a partir do pai (e gravá-las
 * agora duplicaria).
 *
 * O raciocínio só vale quando o pai está no mesmo quadro. Quando o pai
 * vive em outro projeto — ou em nenhum — ninguém nunca desce até a
 * subtarefa, e ela desaparece do portal sem deixar rastro. Essas são as
 * ÓRFÃS: elas voltam para a varredura como raiz.
 */
export function raizesDoQuadro(tarefas) {
  const gidsDoQuadro = new Set(tarefas.map((t) => t.gid));
  const topo = tarefas.filter((t) => !t.parent);
  const orfas = tarefas.filter((t) => t.parent && !gidsDoQuadro.has(t.parent.gid));
  return { topo, orfas };
}

/**
 * Percorre a árvore inteira a partir das raízes, descendo pelas
 * subtarefas. Cada entrada guarda o gid do pai no Asana (não o id da
 * demanda — esse só existe depois de gravar).
 *
 * `buscarSubtarefas(gid)` é injetado: no sync é a chamada à API, no teste
 * é um mapa em memória.
 */
export async function montarArvore(raizes, buscarSubtarefas, opcoes = {}) {
  const maxProfundidade = opcoes.maxProfundidade ?? PROFUNDIDADE_MAXIMA;
  const aoErrar = opcoes.aoErrar ?? (() => {});
  const aoAvisar = opcoes.aoAvisar ?? (() => {});

  const flat = [];
  const vistos = new Set();
  const contagem = {
    duplicadas: 0,
    errosDeSubtarefa: 0,
    chamadasDeSubtarefa: 0,
    folhasPuladas: 0,
    profundidadeMaxima: 0,
  };

  async function descer(tarefas, gidDoPai, profundidade) {
    if (profundidade >= maxProfundidade) {
      aoAvisar(`Profundidade máxima (${maxProfundidade}) atingida, parando de descer aqui.`);
      return;
    }
    for (const t of tarefas) {
      // A mesma tarefa pode ser alcançada por dois caminhos (ela é card do
      // quadro E subtarefa de outro card do mesmo quadro). Gravar as duas
      // faria o upsert receber o mesmo (ministry_id, asana_task_gid) duas
      // vezes no mesmo lote — o Postgres recusa o lote INTEIRO com
      // "ON CONFLICT DO UPDATE command cannot affect row a second time",
      // isto é, uma tarefa repetida derrubava até 300 demandas junto.
      if (vistos.has(t.gid)) {
        contagem.duplicadas++;
        continue;
      }
      vistos.add(t.gid);
      flat.push({ task: t, parentAsanaGid: gidDoPai });
      contagem.profundidadeMaxima = Math.max(contagem.profundidadeMaxima, profundidade);

      // Folha declarada pelo próprio Asana: não há o que buscar. Sem isso
      // o sync pedia as subtarefas de TODA tarefa, inclusive das folhas —
      // num quadro de 1.500 cards eram 1.500 requisições, quase todas para
      // receber lista vazia, e era essa rajada que estourava o limite de
      // taxa da API.
      if (t.num_subtasks === 0) {
        contagem.folhasPuladas++;
        continue;
      }

      try {
        contagem.chamadasDeSubtarefa++;
        const filhas = await buscarSubtarefas(t.gid);
        if (filhas.length > 0) await descer(filhas, t.gid, profundidade + 1);
      } catch (err) {
        // Antes isto era um console.error e a vida seguia. Só que um 429
        // caía aqui: um limite de taxa passageiro apagava um galho inteiro
        // e ninguém ficava sabendo. O cliente do Asana já espera e tenta
        // de novo respeitando Retry-After, então chegar aqui é erro de
        // verdade — agora contado, e vira alerta no fim da rodada.
        contagem.errosDeSubtarefa++;
        aoErrar(t, err);
      }
    }
  }

  await descer(raizes, null, 0);
  return { flat, contagem };
}
