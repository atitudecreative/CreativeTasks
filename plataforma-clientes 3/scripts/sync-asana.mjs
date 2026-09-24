// Sincroniza tarefas do Asana para dentro da tabela `demands`
// (a mesma tabela onde ficam as demandas cadastradas manualmente).
//
// Roda FORA do Next.js — é um script standalone pra ser executado
// manualmente ou por um agendador (cron, GitHub Actions, etc).
// Nunca é chamado a partir do navegador do cliente.
//
// Uso:
//   npm run sync:asana
//
// Requer no .env.local (ou nas env vars do agendador):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   ASANA_ACCESS_TOKEN

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { normalizaSecao, secaoDaTarefa, resolveStatus, dataDe } from "./asana-status.mjs";
import { asanaPaginado, contadores as chamadasAsana, zerarContadores } from "./asana-client.mjs";
import { raizesDoQuadro, montarArvore } from "./asana-arvore.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ASANA_ACCESS_TOKEN) {
  console.error(
    "Faltam variáveis de ambiente. Confira NEXT_PUBLIC_SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY e ASANA_ACCESS_TOKEN no .env.local."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Quantas linhas vão em cada chamada de upsert/insert/select em lote.
// Não tem relação com limite de linhas do Postgres — é só um tamanho de
// payload razoável por requisição HTTP (nem muitas chamadas pequenas,
// nem um payload gigante numa só). Ajustável se algum dia precisar.
const BATCH_SIZE = 300;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

// A base cresceu muito depois que o sync passou a descer recursivamente
// pelas subtarefas (uma tarefa "guarda-chuva" chegou a ter 1500+ filhas) —
// isso multiplicava o número de idas e vindas ao banco (uma consulta +
// uma escrita POR TAREFA), e de vez em quando uma dessas operações
// esbarrava num "statement timeout" — não porque o banco estivesse com
// algum defeito, mas porque milhares de chamadas em sequência, uma de
// cada vez, é carga pesada demais desse jeito. A correção de verdade foi
// reescrever a gravação em LOTES (ver upsertDemandsBatch/linkParents/
// syncAllDemandCampaignLinks abaixo) — isso aqui continua existindo só
// como segurança extra pra um lote que ainda assim esbarre numa
// lentidão passageira do banco.
async function withRetry(operationFn, { attempts = 3, delayMs = 2000, label = "" } = {}) {
  let result;
  for (let i = 0; i < attempts; i++) {
    result = await operationFn();
    const isTimeout = /timeout/i.test(result?.error?.message ?? "");
    if (!result?.error || !isTimeout || i === attempts - 1) return result;
    console.warn(
      `  (${label} deu timeout, tentativa ${i + 1}/${attempts} — tentando de novo em ${delayMs}ms...)`
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return result;
}

// Campos pedidos ao Asana.
//
// `parent` entra pra dar pra detectar, na listagem de primeiro nível do
// projeto, uma tarefa que na verdade é subtarefa de outra (o Asana deixa
// adicionar uma subtarefa como card independente do quadro também — nesse
// caso ela aparece tanto em /projects/{gid}/tasks quanto em
// /tasks/{pai}/subtasks). Sem isso não dá pra diferenciar tarefa de topo
// de verdade de subtarefa "solta" no quadro.
//
// `memberships.section.name` + `memberships.project.gid` são o que
// destrava o status de verdade: `memberships` é a lista de (projeto,
// coluna) em que o card está, e é de lá que sai em qual coluna do quadro
// ele se encontra. Sem isso o sync só conseguia olhar `completed` e
// colapsar 14 status em 2.
//
// `completed_at` e `created_at` viram data_conclusao e data_solicitacao.
// Sem eles não existia tempo de ciclo: data_conclusao nunca era escrita, e
// data_solicitacao pegava o `default current_date` da coluna, ou seja, a
// data em que o SYNC rodou — não a data em que o pedido chegou.
const TASK_FIELDS = [
  "name",
  "completed",
  "completed_at",
  "created_at",
  "modified_at",
  "assignee.name",
  "due_on",
  "permalink_url",
  "notes",
  // gid E nome da tag. O gid é o que identifica a tag de verdade: nome
  // muda no Asana a qualquer momento, e casar campanha por nome fazia um
  // "Funday" renomeado para "Funday 2026" virar uma campanha NOVA,
  // deixando a antiga (com todas as demandas) órfã.
  "tags.gid",
  "tags.name",
  "parent",
  // Quantas subtarefas a tarefa tem. Sem isso o sync chamava
  // /tasks/{gid}/subtasks para TODA tarefa — inclusive as folhas, que
  // nunca têm filhas. Num projeto de 1.500 tarefas eram 1.500
  // requisições, quase todas para receber uma lista vazia, e era essa
  // rajada que estourava o limite de taxa do Asana.
  "num_subtasks",
  "memberships.section.name",
  "memberships.project.gid",
].join(",");

// =========================================================================
// DE-PARA: coluna do quadro do Asana -> status do portal
// =========================================================================
// Ver migration 0031. A regra do ministério vence a global; sem nenhuma
// regra, cai no comportamento antigo.

// Carrega o de-para inteiro de uma vez (é uma tabela pequena) em vez de
// consultar por tarefa.
async function loadStatusMap() {
  const { data, error } = await supabase
    .from("asana_status_map")
    .select("ministry_id, secao_normalizada, status");

  if (error) {
    console.warn(
      `  Aviso: não consegui ler o de-para de status (${error.message}). ` +
        "Seguindo com o comportamento antigo (concluída/em produção)."
    );
    return { global: new Map(), porMinisterio: new Map() };
  }

  const global = new Map();
  const porMinisterio = new Map();

  for (const row of data ?? []) {
    if (row.ministry_id) {
      let m = porMinisterio.get(row.ministry_id);
      if (!m) {
        m = new Map();
        porMinisterio.set(row.ministry_id, m);
      }
      m.set(row.secao_normalizada, row.status);
    } else {
      global.set(row.secao_normalizada, row.status);
    }
  }

  return { global, porMinisterio };
}

// Registra as colunas encontradas, com a contagem de tarefas em cada uma.
// É isso que faz a tela de configuração listar as colunas REAIS de cada
// quadro em vez de pedir que alguém digite o nome de cabeça.
async function registrarSecoes(ministryId, contagemPorSecao) {
  if (contagemPorSecao.size === 0) return;

  const rows = Array.from(contagemPorSecao.entries()).map(([secao, total]) => ({
    ministry_id: ministryId,
    secao,
    secao_normalizada: normalizaSecao(secao),
    total_tarefas: total,
    vista_em: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("asana_secoes")
    .upsert(rows, { onConflict: "ministry_id,secao_normalizada" });

  if (error) {
    // Não derruba a sincronização: isto alimenta uma tela de
    // configuração, não os dados do portal.
    console.warn(`  Aviso: não consegui registrar as colunas do quadro (${error.message}).`);
  }
}


async function fetchAllTasks(projectGid) {
  const { itens, paginas } = await asanaPaginado(`/projects/${projectGid}/tasks`, {
    token: ASANA_ACCESS_TOKEN,
    optFields: TASK_FIELDS,
    rotulo: `tarefas do projeto ${projectGid}`,
  });
  return { tarefas: itens, paginas };
}

// `/projects/{gid}/tasks` só devolve tarefas de primeiro nível — subtarefas
// (demandas "filhas") precisam de uma chamada à parte, por tarefa pai.
async function fetchSubtasks(taskGid) {
  const { itens } = await asanaPaginado(`/tasks/${taskGid}/subtasks`, {
    token: ASANA_ACCESS_TOKEN,
    optFields: TASK_FIELDS,
    rotulo: `subtarefas de ${taskGid}`,
  });
  return itens;
}

// Busca TODAS as campanhas já cadastradas (de qualquer ministério) e monta
// dois índices: por gid da tag do Asana (o identificador de verdade) e por
// nome em minúsculas (usado só para adotar campanhas antigas, criadas antes
// de o gid ser guardado). Global, não por ministério: uma
// tag com o mesmo nome em projetos do Asana de ministérios diferentes
// tem que cair na MESMA campanha, não criar uma por ministério — é o
// que faz um ministério enxergar as demandas de outro que compartilha a
// tag. Carregado uma vez em main() e reaproveitado (e atualizado) em
// todos os ministérios sincronizados na mesma rodada.
async function loadCampaignMap() {
  // Tenta ler o gid da tag; se a coluna ainda não existir (migration 0033
  // não rodou), cai no comportamento antigo — por nome — em vez de
  // derrubar o sync inteiro.
  let porGid = new Map();
  let temColunaGid = true;

  let { data, error } = await supabase.from("campaigns").select("id, nome, asana_tag_gid");

  if (error && /asana_tag_gid/.test(error.message ?? "")) {
    temColunaGid = false;
    console.warn(
      "  Aviso: a coluna campaigns.asana_tag_gid ainda não existe (migration 0033). " +
        "Seguindo por NOME da tag — renomear uma tag no Asana vai criar campanha nova."
    );
    ({ data, error } = await supabase.from("campaigns").select("id, nome"));
  }

  if (error) {
    throw new Error(`Erro ao buscar campanhas: ${error.message}`);
  }

  const porNome = new Map();
  for (const c of data ?? []) {
    porNome.set(c.nome.trim().toLowerCase(), { id: c.id, nome: c.nome });
    if (c.asana_tag_gid) porGid.set(c.asana_tag_gid, { id: c.id, nome: c.nome });
  }

  return { porGid, porNome, temColunaGid };
}

// Todas as tags de uma tarefa do Asana viram campanhas/eventos no portal —
// uma demanda pode estar em várias campanhas ao mesmo tempo (tabela
// demand_campaigns). Cada tag cria (se ainda não existir EM QUALQUER
// MINISTÉRIO) uma campanha "pendente" (publicada = false) — ela só
// aparece pros ministérios envolvidos depois que a Comunicação revisa e
// "abre" o evento em /dashboard/admin/campanhas-pendentes. Se a tag já
// existir (de outro ministério ou do mesmo), reaproveita a campanha —
// `ministryId` aqui só define o "ministério de origem" registrado na
// criação, não um dono exclusivo. Tarefas sem tag ficam sem campanha
// vinculada. Fica sequencial mesmo (não em lote): o número de tags
// DISTINTAS por rodada é pequeno comparado ao número de tarefas, e
// `campaignMap` já evita reconsultar/reinserir a mesma tag duas vezes.
async function ensureCampaignId(ministryId, tag, campaignMap) {
  const gid = tag.gid;
  const nome = (tag.name ?? "").trim();
  if (!nome && !gid) return null;
  const chaveNome = nome.toLowerCase();

  // 1. Pelo ID da tag — o único identificador estável. Se o nome mudou no
  //    Asana, a campanha é a MESMA: só renomeia.
  if (gid && campaignMap.porGid.has(gid)) {
    const atual = campaignMap.porGid.get(gid);
    if (nome && atual.nome.trim() !== nome) {
      const { error } = await supabase.from("campaigns").update({ nome }).eq("id", atual.id);
      if (error) {
        console.warn(`  Não consegui renomear a campanha "${atual.nome}" para "${nome}": ${error.message}`);
      } else {
        console.log(`  ~ Tag renomeada no Asana: "${atual.nome}" -> "${nome}" (mesma campanha, ${atual.id}).`);
        campaignMap.porNome.delete(atual.nome.trim().toLowerCase());
        atual.nome = nome;
        campaignMap.porNome.set(chaveNome, atual);
      }
    }
    return atual.id;
  }

  // 2. Já existe uma campanha com esse nome, criada antes de o sync
  //    conhecer gid: adota o gid em vez de criar uma segunda campanha.
  if (campaignMap.porNome.has(chaveNome)) {
    const atual = campaignMap.porNome.get(chaveNome);
    if (gid && campaignMap.temColunaGid) {
      const { error } = await supabase
        .from("campaigns")
        .update({ asana_tag_gid: gid })
        .eq("id", atual.id)
        .is("asana_tag_gid", null);
      if (error) {
        console.warn(`  Não consegui guardar o ID da tag na campanha "${atual.nome}": ${error.message}`);
      } else {
        campaignMap.porGid.set(gid, atual);
      }
    }
    return atual.id;
  }

  // 3. Não existe: cria.
  const payload = {
    ministry_id: ministryId,
    nome,
    tipo: "campanha",
    origem: "asana_tag",
    publicada: false, // fica escondida do ministério até a Comunicação abrir o evento
  };
  if (gid && campaignMap.temColunaGid) payload.asana_tag_gid = gid;

  const { data, error } = await supabase.from("campaigns").insert(payload).select("id").single();

  if (error) {
    console.warn(`  Não consegui criar a campanha "${nome}": ${error.message}`);
    return null;
  }

  const criada = { id: data.id, nome };
  campaignMap.porNome.set(chaveNome, criada);
  if (gid) campaignMap.porGid.set(gid, criada);
  console.log(
    `  + Nova campanha PENDENTE criada a partir da tag do Asana: "${nome}" (tag ${gid ?? "sem id"}) ` +
      `— aguardando abertura pela Comunicação`
  );
  return data.id;
}

// ---------------------------------------------------------------
// Gravação em lote (substitui o antigo "uma consulta + uma escrita por
// tarefa"). Pra um projeto com milhares de tarefas isso derrubava o
// número de idas e vindas ao banco de milhares pra só algumas dezenas —
// era a causa real dos "statement timeout" recorrentes no sync, não um
// defeito do banco em si.
// ---------------------------------------------------------------

// Grava (cria ou atualiza) todas as demandas de uma vez, em lotes, via
// upsert nativo do Postgres (ON CONFLICT ministry_id+asana_task_gid).
// Não manda `identificador` no payload de propósito: numa linha nova o
// gatilho `set_demand_identificador` gera um valor normalmente (mesmo
// comportamento de sempre); numa linha que já existe, como o upsert do
// PostgREST só atualiza as colunas presentes no payload, o identificador
// existente NUNCA é tocado — sem precisar checar "já existe?" antes, que
// era a outra metade das idas e vindas ao banco por tarefa. Retorna o id
// real (uuid) de cada linha gravada, indexado pelo gid do Asana.
// Piso pra bissecção abaixo (ver upsertDemandsChunk): não vale a pena
// dividir menos que isso — se até um lote pequeno assim ainda der timeout,
// o problema não é o TAMANHO do lote (não é CPU/memória proporcional ao
// número de linhas), e sim algo externo à query em si (ex: statement_timeout
// curto demais no projeto do Supabase, ou lock disputado com outra sessão
// no banco) — dividir mais não vai resolver, só multiplicar tentativas.
const MIN_BATCH_SIZE = 20;

// Grava um lote (ou pedaço de lote) de demandas; se o timeout persistir
// mesmo depois das tentativas do withRetry, divide o lote ao meio e tenta
// cada metade separada, em vez de descartar todo mundo de uma vez — um
// lote de 159 demandas que dá timeout inteiro pode passar perfeitamente
// bem quando dividido em pedaços menores.
async function upsertDemandsChunk(batch) {
  const { data, error } = await withRetry(
    () =>
      supabase
        .from("demands")
        .upsert(batch, { onConflict: "ministry_id,asana_task_gid" })
        .select("id, asana_task_gid"),
    { label: `gravar lote de ${batch.length} demanda(s)` }
  );

  if (!error) return data ?? [];

  const isTimeout = /timeout/i.test(error.message ?? "");
  if (isTimeout && batch.length > MIN_BATCH_SIZE) {
    const mid = Math.ceil(batch.length / 2);
    console.warn(
      `  Lote de ${batch.length} demanda(s) continuou dando timeout — dividindo em dois pedaços de ` +
        `${mid} e ${batch.length - mid} e tentando separado.`
    );
    // Sequencial, não em paralelo: se a causa for disputa de lock no banco
    // (não custo computacional proporcional ao tamanho do lote), mandar as
    // duas metades ao mesmo tempo só recriaria a mesma disputa.
    const left = await upsertDemandsChunk(batch.slice(0, mid));
    const right = await upsertDemandsChunk(batch.slice(mid));
    return [...left, ...right];
  }

  console.error(
    `  Erro ao gravar um lote de ${batch.length} demanda(s): ${error.message}. Pulando esse lote (${batch
      .map((r) => r.titulo)
      .slice(0, 3)
      .join(", ")}${batch.length > 3 ? ", ..." : ""}).`
  );
  return [];
}

async function upsertDemandsBatch(rows) {
  const written = [];
  for (const batch of chunk(rows, BATCH_SIZE)) {
    written.push(...(await upsertDemandsChunk(batch)));
  }
  return written;
}

// Agora que toda tarefa (pai ou filha) já tem um id real de verdade no
// banco, resolve o parent_demand_id de cada subtarefa. Agrupado por PAI,
// não por filha — uma tarefa "guarda-chuva" com 1500 filhas gera UMA
// chamada (atualizando as 1500 de uma vez via `.in()`), não 1500.
async function linkParents(flatEntries, gidToId) {
  const groups = new Map(); // parentDemandId -> [childId, ...]

  for (const { task, parentAsanaGid } of flatEntries) {
    if (!parentAsanaGid) continue;
    const childId = gidToId.get(task.gid);
    const parentId = gidToId.get(parentAsanaGid);
    if (!childId || !parentId) continue; // pai ou filha ficou de fora (lote falhou) — pula

    if (!groups.has(parentId)) groups.set(parentId, []);
    groups.get(parentId).push(childId);
  }

  for (const [parentId, childIds] of groups) {
    for (const idsBatch of chunk(childIds, BATCH_SIZE)) {
      const { error } = await withRetry(
        () => supabase.from("demands").update({ parent_demand_id: parentId }).in("id", idsBatch),
        { label: `linkar ${idsBatch.length} subtarefa(s) ao pai` }
      );
      if (error) {
        console.warn(`  Não consegui linkar ${idsBatch.length} subtarefa(s) ao pai: ${error.message}`);
      }
    }
  }
}

// Garante que demand_campaigns reflita exatamente as tags atuais de TODAS
// as tarefas dessa rodada de uma vez — lê os vínculos existentes de todas
// as demandas envolvidas em lotes, calcula o que falta adicionar/remover,
// e grava tudo de uma vez (um insert em lote pros novos vínculos; um
// delete por demanda só pras remoções, que na prática são raras — só
// acontecem quando uma tag é tirada de uma tarefa no Asana).
// `desiredLinksByDemandId` precisa ter uma entrada pra CADA demanda dessa
// rodada, mesmo com Set vazio — é isso que faz uma tarefa que perdeu todas
// as tags soltar os vínculos antigos.
async function syncAllDemandCampaignLinks(desiredLinksByDemandId) {
  const demandIds = [...desiredLinksByDemandId.keys()];
  if (demandIds.length === 0) return;

  const existingByDemand = new Map(); // demandId -> Set<campaignId>
  for (const idsBatch of chunk(demandIds, BATCH_SIZE)) {
    const { data, error } = await withRetry(
      () => supabase.from("demand_campaigns").select("demand_id, campaign_id").in("demand_id", idsBatch),
      { label: `ler vínculos de campanha de ${idsBatch.length} demanda(s)` }
    );
    if (error) {
      console.warn(`  Não consegui ler vínculos de campanha existentes: ${error.message}`);
      continue;
    }
    for (const row of data ?? []) {
      if (!existingByDemand.has(row.demand_id)) existingByDemand.set(row.demand_id, new Set());
      existingByDemand.get(row.demand_id).add(row.campaign_id);
    }
  }

  const toAdd = [];
  const toRemoveByDemand = new Map();

  for (const [demandId, desiredSet] of desiredLinksByDemandId) {
    const existingSet = existingByDemand.get(demandId) ?? new Set();

    for (const campaignId of desiredSet) {
      if (!existingSet.has(campaignId)) toAdd.push({ demand_id: demandId, campaign_id: campaignId });
    }

    const toRemove = [...existingSet].filter((id) => !desiredSet.has(id));
    if (toRemove.length > 0) toRemoveByDemand.set(demandId, toRemove);
  }

  for (const rowsBatch of chunk(toAdd, BATCH_SIZE)) {
    const { error } = await withRetry(
      () => supabase.from("demand_campaigns").insert(rowsBatch),
      { label: `vincular ${rowsBatch.length} demanda(s) a campanha(s)` }
    );
    if (error) console.warn(`  Não consegui vincular ${rowsBatch.length} demanda(s) a campanha(s): ${error.message}`);
  }

  for (const [demandId, campaignIds] of toRemoveByDemand) {
    const { error } = await withRetry(
      () => supabase.from("demand_campaigns").delete().eq("demand_id", demandId).in("campaign_id", campaignIds),
      { label: `remover vínculo(s) de campanha antigos` }
    );
    if (error) console.warn(`  Não consegui remover vínculo(s) de campanha antigos: ${error.message}`);
  }
}

async function touchDataSource(ministryId) {
  await supabase
    .from("data_sources")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("ministry_id", ministryId)
    .eq("source", "asana");
}

async function syncMinistry(dataSource, campaignMap, statusMap) {
  const { ministry_id: ministryId, external_id: projectGid } = dataSource;

  if (!projectGid) {
    console.warn(
      `Ministério ${ministryId}: data_sources sem external_id (gid do projeto Asana). Pulando.`
    );
    // Vira alerta, não só um aviso no meio do log: um ministério cadastrado
    // sem o gid do projeto nunca recebe demanda nenhuma, e isso parece
    // "quadro vazio" para quem olha o portal.
    return {
      ministryId,
      projectGid: null,
      porTag: new Map(),
      alertas: [`ministério ${ministryId} está cadastrado em data_sources sem o gid do projeto do Asana — nunca sincroniza.`],
    };
  }

  console.log(`Sincronizando projeto Asana ${projectGid} (ministério ${ministryId})...`);

  const { tarefas: allTasks, paginas } = await fetchAllTasks(projectGid);


  // Antes daqui saía só `allTasks.filter((t) => !t.parent)`: toda tarefa
  // com `parent` era descartada, no raciocínio de que ela entraria depois
  // pela varredura a partir do pai. Isso só vale quando o pai está no
  // MESMO quadro — ver raizesDoQuadro() e o teste asana-arvore.test.mjs.
  // A ordem importa: as de topo primeiro, para que quem for alcançado
  // pela árvore de verdade guarde o pai certo; as órfãs depois, e o
  // controle de duplicidade de montarArvore ignora as já visitadas.
  const { topo: raizesDeTopo, orfas } = raizesDoQuadro(allTasks);
  if (orfas.length > 0) {
    console.log(
      `  ${orfas.length} tarefa(s) do quadro são subtarefas cujo pai não está neste projeto — ` +
        `entram como raiz (antes eram descartadas silenciosamente).`
    );
  }

  // Fase 1: busca a árvore inteira (topo + subtarefas) no Asana, sem
  // tocar no banco ainda.
  const { flat: flatEntries, contagem } = await montarArvore(
    [...raizesDeTopo, ...orfas],
    fetchSubtasks,
    {
      aoErrar: (tarefa, err) =>
        console.error(
          `  ERRO ao buscar subtarefas de "${tarefa.name}" (${tarefa.gid}): ${err.message}. ` +
            `As subtarefas dessa ramificação ficaram de fora desta rodada.`
        ),
      aoAvisar: (msg) => console.warn(`  ${msg}`),
    }
  );

  // Quantas demandas do Asana já existem no banco para este ministério.
  // É a régua para detectar anomalia mais adiante: o sync nunca APAGA
  // demanda, então o que já está gravado é piso — encontrar menos do que
  // já existe significa que alguma coisa se perdeu no caminho de hoje.
  // (Não é limite inventado: a comparação é com o número real da rodada
  // anterior, não com um palpite.)
  const { count: jaNoBanco } = await supabase
    .from("demands")
    .select("id", { count: "exact", head: true })
    .eq("ministry_id", ministryId)
    .eq("fonte_externa", "asana");

  const resumo = {
    ministryId,
    projectGid,
    paginas,
    listadas: allTasks.length,
    topo: raizesDeTopo.length,
    orfas: orfas.length,
    coletadas: flatEntries.length,
    duplicadas: contagem.duplicadas,
    folhasPuladas: contagem.folhasPuladas,
    chamadasDeSubtarefa: contagem.chamadasDeSubtarefa,
    errosDeSubtarefa: contagem.errosDeSubtarefa,
    gravadas: 0,
    naoGravadas: 0,
    jaNoBanco: jaNoBanco ?? null,
    porTag: new Map(),
    comTag: 0,
    semTag: 0,
    alertas: [],
  };

  for (const { task } of flatEntries) {
    const tags = (task.tags ?? []).filter((t) => t && (t.gid || t.name));
    if (tags.length === 0) resumo.semTag++;
    else resumo.comTag++;
    for (const t of tags) {
      const chave = `${t.name ?? "(sem nome)"} [${t.gid ?? "sem id"}]`;
      resumo.porTag.set(chave, (resumo.porTag.get(chave) ?? 0) + 1);
    }
  }

  if (flatEntries.length === 0) {
    console.log(`  -> nenhuma tarefa encontrada nesse projeto.`);
    if ((jaNoBanco ?? 0) > 0) {
      resumo.alertas.push(
        `projeto ${projectGid}: o Asana não devolveu NENHUMA tarefa, mas o banco já tem ` +
          `${jaNoBanco} demanda(s) vinda(s) daqui. Isso não é projeto vazio — é sinal de ` +
          `projeto trocado, permissão perdida ou quadro arquivado.`
      );
    }
    await touchDataSource(ministryId);
    return resumo;
  }

  // Fase 2: grava todas as demandas de uma vez, em lotes — ainda sem
  // parent_demand_id (não dá pra saber o id real de um pai que também é
  // novo nessa mesma rodada antes dele já estar gravado).
  // Colunas do quadro encontradas nesta rodada, com quantas tarefas em
  // cada uma — vira o catálogo que a tela de configuração oferece.
  const contagemPorSecao = new Map();

  const rows = flatEntries.map(({ task }) => {
    const secao = secaoDaTarefa(task, projectGid);
    if (secao) contagemPorSecao.set(secao, (contagemPorSecao.get(secao) ?? 0) + 1);

    return {
      ministry_id: ministryId,
      asana_task_gid: task.gid,
      titulo: task.name,
      status: resolveStatus(task, secao, ministryId, statusMap),
      prazo_acordado: task.due_on ?? null,
      // Datas reais, do próprio Asana. Sem elas não havia como calcular
      // tempo de ciclo: data_conclusao nunca era preenchida, e
      // data_solicitacao caía no default da coluna (a data do sync).
      data_conclusao: dataDe(task.completed_at),
      data_solicitacao: dataDe(task.created_at),
      link_origem: task.permalink_url ?? null,
      observacao_interna: task.assignee?.name
        ? `Sincronizado do Asana. Responsável no Asana: ${task.assignee.name}.`
        : "Sincronizado do Asana.",
      fonte_externa: "asana",
      updated_at: new Date().toISOString(),
    };
  });

  await registrarSecoes(ministryId, contagemPorSecao);

  const written = await upsertDemandsBatch(rows);
  const gidToId = new Map(written.map((r) => [r.asana_task_gid, r.id]));

  // Fase 3: liga cada subtarefa ao pai certo, agora que todo mundo tem um
  // id real — agrupado por pai (ver linkParents).
  await linkParents(flatEntries, gidToId);

  // Fase 4: tags -> campanhas, calculado e gravado de uma vez pra toda a
  // rodada (ver syncAllDemandCampaignLinks).
  const desiredLinksByDemandId = new Map();
  for (const { task } of flatEntries) {
    const demandId = gidToId.get(task.gid);
    if (!demandId) continue; // ficou de fora por erro no lote — já foi avisado acima

    const tags = (task.tags ?? []).filter((t) => t && (t.gid || t.name));
    const campaignIds = new Set();
    for (const tag of tags) {
      const campaignId = await ensureCampaignId(ministryId, tag, campaignMap);
      if (campaignId) campaignIds.add(campaignId);
    }
    desiredLinksByDemandId.set(demandId, campaignIds);
  }
  await syncAllDemandCampaignLinks(desiredLinksByDemandId);

  const demandCount = flatEntries.length;
  const completedCount = flatEntries.filter((e) => e.task.completed).length;
  const subtaskCount = flatEntries.filter((e) => e.parentAsanaGid !== null).length;
  const openCount = demandCount - completedCount;
  const skippedCount = demandCount - written.length;

  resumo.gravadas = written.length;
  resumo.naoGravadas = skippedCount;

  // Anomalia: encontrar menos do que já está gravado. O sync nunca apaga
  // demanda, então o número só cai quando alguma coisa se perdeu na
  // leitura (permissão, limite de taxa, projeto trocado) — ou quando
  // alguém apagou tarefas no Asana de verdade. Nos dois casos é para
  // aparecer no log, não para passar batido.
  if (resumo.jaNoBanco != null && demandCount < resumo.jaNoBanco) {
    resumo.alertas.push(
      `projeto ${projectGid}: encontrei ${demandCount} tarefa(s), mas o banco já tinha ` +
        `${resumo.jaNoBanco} demanda(s) deste ministério vindas do Asana ` +
        `(${resumo.jaNoBanco - demandCount} a menos).` +
        (resumo.errosDeSubtarefa > 0
          ? ` Houve ${resumo.errosDeSubtarefa} erro(s) ao buscar subtarefas — a queda provavelmente é isso.`
          : " Nenhum erro de leitura nesta rodada: ou tarefas foram apagadas no Asana, ou saíram do projeto.")
    );
  }
  if (skippedCount > 0) {
    resumo.alertas.push(`projeto ${projectGid}: ${skippedCount} demanda(s) não foram gravadas por erro no banco.`);
  }
  if (resumo.errosDeSubtarefa > 0) {
    resumo.alertas.push(
      `projeto ${projectGid}: ${resumo.errosDeSubtarefa} ramificação(ões) de subtarefas ficaram de fora por erro na API.`
    );
  }

  await touchDataSource(ministryId);

  console.log(
    `  -> ${written.length}/${demandCount} demandas gravadas (${openCount} em produção, ` +
      `${completedCount} concluídas, ${subtaskCount} são subtarefas)` +
      (skippedCount > 0 ? ` — ${skippedCount} não gravada(s) por erro (veja acima).` : ".")
  );
  console.log(
    `     páginas: ${paginas} | listadas no quadro: ${allTasks.length} (${raizesDeTopo.length} de topo, ` +
      `${orfas.length} órfã(s)) | subtarefas consultadas: ${contagem.chamadasDeSubtarefa} ` +
      `(${contagem.folhasPuladas} folha(s) sem consulta) | repetidas ignoradas: ${contagem.duplicadas}`
  );

  return resumo;
}

// Trava manual (tabela `sync_lock`, migration 0020) pra impedir duas
// rodadas do sync correndo ao mesmo tempo. O UPDATE é atômico: só "ganha"
// o cadeado quem conseguir mudar `locked` de false (ou destravado há mais
// de 1h, sinal de rodada anterior que morreu sem liberar) pra true numa
// única operação — se duas chamadas tentarem ao mesmo tempo, o banco
// serializa e só uma consegue.
async function tryAcquireSyncLock() {
  const staleThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("sync_lock")
    .update({ locked: true, locked_at: new Date().toISOString() })
    .eq("id", "asana")
    .or(`locked.eq.false,locked_at.lt.${staleThreshold}`)
    .select("id");

  if (error) {
    throw new Error(`Erro ao tentar travar a sincronização: ${error.message}`);
  }

  return (data ?? []).length > 0;
}

async function releaseSyncLock() {
  const { error } = await supabase.from("sync_lock").update({ locked: false }).eq("id", "asana");
  if (error) {
    console.warn(`Não consegui destravar a sincronização (não deve travar a próxima rodada, ela ` +
      `também tenta destravar sozinha se achar o cadeado com mais de 1h): ${error.message}`);
  }
}

// =========================================================================
// RELATÓRIO DA RODADA
// =========================================================================
// O log antigo dizia "X demandas gravadas" e parava por aí. Quando o
// portal mostrava menos do que o Asana tem, não havia como saber ONDE a
// conta quebrou — se na leitura da API, no filtro de topo, na gravação ou
// nas tags. Este bloco existe para que a resposta esteja no próprio log
// do Render, sem precisar rodar nada.
function relatorioDaRodada({ comecou, sources, resumos, falhas }) {
  const soma = (campo) => resumos.reduce((acc, r) => acc + (r[campo] ?? 0), 0);
  const segundos = ((Date.now() - comecou) / 1000).toFixed(1);

  console.log("");
  console.log("================ RELATÓRIO DA RODADA ================");
  console.log(`duração: ${segundos}s`);
  console.log(`ministérios cadastrados: ${sources.length} | sincronizados: ${resumos.length} | com falha: ${falhas.length}`);
  console.log(`requisições ao Asana: ${chamadasAsana.requisicoes} em ${chamadasAsana.paginas} página(s) de coleção`);
  console.log(
    `esperas por limite de taxa (429): ${chamadasAsana.esperasPorLimite} | novas tentativas (rede/5xx): ` +
      `${chamadasAsana.novasTentativas} | tempo esperando: ${(chamadasAsana.msEsperando / 1000).toFixed(1)}s`
  );
  console.log(
    `tarefas listadas nos quadros: ${soma("listadas")} | coletadas (com subtarefas): ${soma("coletadas")} | ` +
      `repetidas ignoradas: ${soma("duplicadas")}`
  );
  console.log(
    `subtarefas órfãs recuperadas: ${soma("orfas")} | ramificações perdidas por erro: ${soma("errosDeSubtarefa")}`
  );
  console.log(`gravadas: ${soma("gravadas")} | não gravadas por erro: ${soma("naoGravadas")}`);
  console.log(`com pelo menos uma tag: ${soma("comTag")} | sem nenhuma tag: ${soma("semTag")}`);

  // Contagem por tag: é o número que responde "quantas demandas com a tag
  // X o cron encontrou HOJE", sem precisar abrir o banco.
  const porTag = new Map();
  for (const r of resumos) {
    for (const [tag, n] of r.porTag) porTag.set(tag, (porTag.get(tag) ?? 0) + n);
  }
  if (porTag.size > 0) {
    console.log("");
    console.log("tarefas por tag encontradas nesta rodada:");
    for (const [tag, n] of [...porTag].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(5)}  ${tag}`);
    }
  }

  const alertas = resumos.flatMap((r) => r.alertas);
  if (falhas.length > 0 || alertas.length > 0) {
    console.log("");
    console.log("ALERTAS:");
    for (const f of falhas) {
      console.log(`  ! ministério ${f.ministryId} (projeto ${f.projectGid ?? "sem gid"}) não sincronizou: ${f.mensagem}`);
    }
    for (const a of alertas) console.log(`  ! ${a}`);
  }
  console.log("=====================================================");
  console.log("");
}

async function main() {
  const comecou = Date.now();
  zerarContadores();
  console.log(`Sincronização com o Asana iniciada em ${new Date().toISOString()}.`);

  const acquired = await tryAcquireSyncLock();
  if (!acquired) {
    console.log(
      "Já existe uma sincronização em andamento (ou travada há menos de 1h) — saindo sem fazer " +
        "nada, pra não rodar em paralelo e brigar pelos mesmos dados."
    );
    return;
  }

  try {
    const { data: sources, error } = await supabase
      .from("data_sources")
      .select("ministry_id, external_id")
      .eq("source", "asana");

    if (error) {
      throw new Error(`Erro ao buscar data_sources: ${error.message}`);
    }

    if (!sources || sources.length === 0) {
      console.log(
        "Nenhum ministério com integração 'asana' cadastrada em data_sources. Nada a fazer."
      );
      return;
    }

    // Um mapa só, carregado uma vez e compartilhado entre todos os
    // ministérios dessa rodada — assim, se dois ministérios sincronizados
    // na mesma execução introduzirem a mesma tag nova, a segunda reaproveita
    // a campanha que a primeira acabou de criar em vez de duplicar.
    const campaignMap = await loadCampaignMap();

    // De-para de status, também carregado uma vez pra rodada inteira —
    // é uma tabela pequena, e assim nenhuma tarefa gera consulta própria.
    const statusMap = await loadStatusMap();

    // Cada ministério é isolado: se um falhar (ex: erro genuíno na API do
    // Asana), fica registrado no log e a rotina segue pros próximos — mas
    // o job ainda termina com status de erro (exit code 1) se algum
    // falhou, pra não mascarar o problema no painel do Render.
    let hadError = false;
    const resumos = [];
    const falhas = [];
    for (const source of sources) {
      try {
        const resumo = await syncMinistry(source, campaignMap, statusMap);
        if (resumo) resumos.push(resumo);
      } catch (err) {
        hadError = true;
        falhas.push({ ministryId: source.ministry_id, projectGid: source.external_id, mensagem: err.message });
        console.error(`Erro ao sincronizar ministério ${source.ministry_id}: ${err.message}. Seguindo pros próximos.`);
      }
    }

    relatorioDaRodada({ comecou, sources, resumos, falhas });

    const alertas = resumos.flatMap((r) => r.alertas);
    if (alertas.length > 0 || falhas.length > 0) hadError = true;

    console.log(
      hadError
        ? "Sincronização com o Asana concluída — COM PENDÊNCIAS (veja o relatório acima)."
        : "Sincronização com o Asana concluída sem pendências."
    );

    if (hadError) process.exitCode = 1;
  } finally {
    await releaseSyncLock();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
