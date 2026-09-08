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

const ASANA_API = "https://app.asana.com/api/1.0";
// `parent` entra pra dar pra detectar, na listagem de primeiro nível do
// projeto, uma tarefa que na verdade é subtarefa de outra (o Asana deixa
// adicionar uma subtarefa como card independente do quadro também — nesse
// caso ela aparece tanto em /projects/{gid}/tasks quanto em
// /tasks/{pai}/subtasks). Sem isso não dá pra diferenciar tarefa de topo
// de verdade de subtarefa "solta" no quadro.
const TASK_FIELDS = "name,completed,assignee.name,due_on,permalink_url,notes,tags.name,parent";

async function fetchAllTasks(projectGid) {
  const tasks = [];
  let offset;

  do {
    const url = new URL(`${ASANA_API}/projects/${projectGid}/tasks`);
    url.searchParams.set("opt_fields", TASK_FIELDS);
    url.searchParams.set("limit", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${ASANA_ACCESS_TOKEN}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Asana API retornou ${res.status} para o projeto ${projectGid}: ${body}`
      );
    }

    const json = await res.json();
    tasks.push(...json.data);
    offset = json.next_page?.offset;
  } while (offset);

  return tasks;
}

// `/projects/{gid}/tasks` só devolve tarefas de primeiro nível — subtarefas
// (demandas "filhas") precisam de uma chamada à parte, por tarefa pai.
async function fetchSubtasks(taskGid) {
  const tasks = [];
  let offset;

  do {
    const url = new URL(`${ASANA_API}/tasks/${taskGid}/subtasks`);
    url.searchParams.set("opt_fields", TASK_FIELDS);
    url.searchParams.set("limit", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${ASANA_ACCESS_TOKEN}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Asana API retornou ${res.status} para as subtarefas de ${taskGid}: ${body}`
      );
    }

    const json = await res.json();
    tasks.push(...json.data);
    offset = json.next_page?.offset;
  } while (offset);

  return tasks;
}

// Trava de segurança: uma hierarquia de subtarefas do Asana não deveria
// nunca chegar nem perto disso, mas evita recursão descontrolada (ex: se
// algum dado vier estranho) travar a sincronização inteira.
const MAX_SUBTASK_DEPTH = 15;

// Busca a árvore INTEIRA de tarefas (topo + subtarefas, recursivamente)
// direto do Asana, sem tocar no banco ainda — isso é só o lado "leitura da
// API do Asana" do sync, separado de propósito da parte "gravar no
// Postgres" (ver syncMinistry). Cada entrada guarda o gid do pai no Asana
// (não o id da demanda — esse só existe depois de gravar), pra resolver o
// parent_demand_id de verdade numa fase posterior, depois que todo mundo
// já tem um id real no banco.
async function collectTaskTree(topLevelTasks) {
  const flat = [];

  async function walk(tasks, parentAsanaGid, depth) {
    if (depth >= MAX_SUBTASK_DEPTH) {
      console.warn(`  Profundidade máxima (${MAX_SUBTASK_DEPTH}) atingida, parando de descer aqui.`);
      return;
    }
    for (const t of tasks) {
      flat.push({ task: t, parentAsanaGid });
      try {
        const subtasks = await fetchSubtasks(t.gid);
        if (subtasks.length > 0) await walk(subtasks, t.gid, depth + 1);
      } catch (err) {
        console.error(
          `  Erro ao buscar subtarefas de "${t.name}" (${t.gid}) no Asana: ${err.message}. Pulando essa ramificação.`
        );
      }
    }
  }

  await walk(topLevelTasks, null, 0);
  return flat;
}

// Busca TODAS as campanhas já cadastradas (de qualquer ministério) e
// monta um mapa nome (minúsculo) -> id. Global, não por ministério: uma
// tag com o mesmo nome em projetos do Asana de ministérios diferentes
// tem que cair na MESMA campanha, não criar uma por ministério — é o
// que faz um ministério enxergar as demandas de outro que compartilha a
// tag. Carregado uma vez em main() e reaproveitado (e atualizado) em
// todos os ministérios sincronizados na mesma rodada.
async function loadCampaignMap() {
  const { data, error } = await supabase.from("campaigns").select("id, nome");

  if (error) {
    throw new Error(`Erro ao buscar campanhas: ${error.message}`);
  }

  const map = new Map();
  for (const c of data ?? []) map.set(c.nome.trim().toLowerCase(), c.id);
  return map;
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
async function ensureCampaignId(ministryId, tagName, campaignMap) {
  const key = tagName.trim().toLowerCase();
  if (campaignMap.has(key)) return campaignMap.get(key);

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      ministry_id: ministryId,
      nome: tagName.trim(),
      tipo: "campanha",
      origem: "asana_tag",
      publicada: false, // fica escondida do ministério até a Comunicação abrir o evento
    })
    .select("id")
    .single();

  if (error) {
    console.warn(`  Não consegui criar a campanha "${tagName}": ${error.message}`);
    return null;
  }

  campaignMap.set(key, data.id);
  console.log(`  + Nova campanha PENDENTE criada a partir da tag do Asana: "${tagName.trim()}" (aguardando abertura pela Comunicação)`);
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
async function upsertDemandsBatch(rows) {
  const written = [];
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { data, error } = await withRetry(
      () =>
        supabase
          .from("demands")
          .upsert(batch, { onConflict: "ministry_id,asana_task_gid" })
          .select("id, asana_task_gid"),
      { label: `gravar lote de ${batch.length} demanda(s)` }
    );

    if (error) {
      console.error(
        `  Erro ao gravar um lote de ${batch.length} demanda(s): ${error.message}. Pulando esse lote (${batch
          .map((r) => r.titulo)
          .slice(0, 3)
          .join(", ")}${batch.length > 3 ? ", ..." : ""}).`
      );
      continue;
    }

    written.push(...(data ?? []));
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

async function syncMinistry(dataSource, campaignMap) {
  const { ministry_id: ministryId, external_id: projectGid } = dataSource;

  if (!projectGid) {
    console.warn(
      `Ministério ${ministryId}: data_sources sem external_id (gid do projeto Asana). Pulando.`
    );
    return;
  }

  console.log(`Sincronizando projeto Asana ${projectGid} (ministério ${ministryId})...`);

  const allTasks = await fetchAllTasks(projectGid);

  // Só processa aqui quem NÃO tem `parent` (tarefa de topo de verdade).
  // Quem tem `parent` é uma subtarefa que também foi adicionada como card
  // do quadro — ela é ignorada neste laço e só entra via collectTaskTree,
  // chamado a partir do pai verdadeiro. Sem esse filtro, ela seria gravada
  // duas vezes (uma vez como se fosse pai, outra como filha de verdade).
  const topLevelTasks = allTasks.filter((t) => !t.parent);

  // Fase 1: busca a árvore inteira (topo + subtarefas) no Asana, sem
  // tocar no banco ainda.
  const flatEntries = await collectTaskTree(topLevelTasks);

  if (flatEntries.length === 0) {
    console.log(`  -> nenhuma tarefa encontrada nesse projeto.`);
    await touchDataSource(ministryId);
    return;
  }

  // Fase 2: grava todas as demandas de uma vez, em lotes — ainda sem
  // parent_demand_id (não dá pra saber o id real de um pai que também é
  // novo nessa mesma rodada antes dele já estar gravado).
  const rows = flatEntries.map(({ task }) => ({
    ministry_id: ministryId,
    asana_task_gid: task.gid,
    titulo: task.name,
    status: task.completed ? "concluida" : "em_producao",
    prazo_acordado: task.due_on ?? null,
    link_origem: task.permalink_url ?? null,
    observacao_interna: task.assignee?.name
      ? `Sincronizado do Asana. Responsável no Asana: ${task.assignee.name}.`
      : "Sincronizado do Asana.",
    fonte_externa: "asana",
    updated_at: new Date().toISOString(),
  }));

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

    const tagNames = (task.tags ?? []).map((t) => t.name).filter(Boolean);
    const campaignIds = new Set();
    for (const tagName of tagNames) {
      const campaignId = await ensureCampaignId(ministryId, tagName, campaignMap);
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

  await touchDataSource(ministryId);

  console.log(
    `  -> ${written.length}/${demandCount} demandas gravadas (${openCount} em produção, ` +
      `${completedCount} concluídas, ${subtaskCount} são subtarefas)` +
      (skippedCount > 0 ? ` — ${skippedCount} não gravada(s) por erro (veja acima).` : ".")
  );
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

async function main() {
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

    // Cada ministério é isolado: se um falhar (ex: erro genuíno na API do
    // Asana), fica registrado no log e a rotina segue pros próximos — mas
    // o job ainda termina com status de erro (exit code 1) se algum
    // falhou, pra não mascarar o problema no painel do Render.
    let hadError = false;
    for (const source of sources) {
      try {
        await syncMinistry(source, campaignMap);
      } catch (err) {
        hadError = true;
        console.error(`Erro ao sincronizar ministério ${source.ministry_id}: ${err.message}. Seguindo pros próximos.`);
      }
    }

    console.log(
      hadError
        ? "Sincronização com o Asana concluída — com erro em pelo menos um ministério (veja acima)."
        : "Sincronização com o Asana concluída."
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
