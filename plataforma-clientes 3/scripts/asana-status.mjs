// =========================================================================
// DE-PARA: coluna do quadro do Asana -> status do portal
// =========================================================================
// Lógica PURA, sem I/O, separada do sync-asana.mjs de propósito: é a
// regra que decide o status de toda demanda vinda do Asana, e regra assim
// precisa ser testável sem credencial, sem rede e sem banco.
// Ver scripts/asana-status.test.mjs e a migration 0031.

// Mesma normalização da função normaliza_secao() do banco. Os dois lados
// TÊM que gerar exatamente a mesma chave — se divergirem, a regra que a
// Comunicação cadastrou na tela nunca casa com a coluna que o sync viu.
const ACENTOS = "ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ";
const SEM_ACENTO = "AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn";

export function normalizaSecao(texto) {
  if (!texto) return null;
  let out = "";
  for (const ch of texto) {
    const i = ACENTOS.indexOf(ch);
    out += i >= 0 ? SEM_ACENTO[i] : ch;
  }
  return out.trim().toLowerCase() || null;
}

// Em qual coluna do quadro ESTE card está.
//
// `memberships` traz um item por projeto em que a tarefa aparece, então
// precisa filtrar pelo projeto sendo sincronizado agora — senão um card
// que também mora no quadro de outro ministério traria a coluna errada.
//
// Subtarefa não é card de quadro: vem sem membership e devolve null de
// propósito, caindo no fallback. Está certo — subtarefa não tem coluna.
export function secaoDaTarefa(task, projectGid) {
  const memberships = task?.memberships ?? [];
  const doProjeto = memberships.find((m) => m?.project?.gid === projectGid);
  return doProjeto?.section?.name ?? null;
}

/**
 * Resolve o status do portal para uma tarefa do Asana.
 *
 * Ordem: concluído no Asana > regra do ministério > regra global >
 * comportamento antigo.
 *
 * `completed` vence a coluna porque é o sinal mais forte que existe:
 * card marcado como concluído parado numa coluna "Em arte" está
 * concluído, não em produção.
 */
export function resolveStatus(task, secaoNome, ministryId, statusMap) {
  if (task?.completed) return "concluida";

  const chave = normalizaSecao(secaoNome);
  if (chave) {
    const doMinisterio = statusMap?.porMinisterio?.get(ministryId)?.get(chave);
    if (doMinisterio) return doMinisterio;

    const global = statusMap?.global?.get(chave);
    if (global) return global;
  }

  // Sem coluna, ou coluna ainda não mapeada: exatamente o que o sync
  // fazia antes desta mudança.
  return "em_producao";
}

/** Data (YYYY-MM-DD) a partir do timestamp ISO que o Asana devolve. */
export function dataDe(isoTimestamp) {
  return isoTimestamp ? isoTimestamp.slice(0, 10) : null;
}
