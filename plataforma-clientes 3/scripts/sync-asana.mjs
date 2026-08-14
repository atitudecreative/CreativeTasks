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

// A base cresceu muito depois que o sync passou a descer recursivamente
// pelas subtarefas (uma tarefa "guarda-chuva" chegou a ter 1500+ filhas) —
// isso multiplicou o número de idas e vindas ao banco, e de vez em quando
// uma dessas operações esbarra num "statement timeout" passageiro (carga
// momentânea, não um erro real de dado). Em vez de deixar isso derrubar a
// sincronização inteira, tenta de novo algumas vezes com uma pequena
// pausa antes de desistir.
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
// vinculada.
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

// Garante que demand_campaigns reflita exatamente as tags atuais da
// tarefa: adiciona vínculo novo, remove vínculo de tag que foi tirada no
// Asana.
async function syncDemandCampaignLinks(demandId, desiredCampaignIds) {
  const { data: existingLinks, error: existingError } = await supabase
    .from("demand_campaigns")
    .select("campaign_id")
    .eq("demand_id", demandId);

  if (existingError) {
    console.warn(`  Não consegui ler campanhas vinculadas da demanda: ${existingError.message}`);
    return;
  }

  const existingIds = new Set((existingLinks ?? []).map((r) => r.campaign_id));
  const desiredIds = new Set(desiredCampaignIds);

  const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !desiredIds.has(id));

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from("demand_campaigns")
      .insert(toAdd.map((campaignId) => ({ demand_id: demandId, campaign_id: campaignId })));

    if (insertError) {
      console.warn(`  Não consegui vincular demanda à campanha: ${insertError.message}`);
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("demand_campaigns")
      .delete()
      .eq("demand_id", demandId)
      .in("campaign_id", toRemove);

    if (deleteError) {
      console.warn(`  Não consegui remover vínculo de campanha antiga: ${deleteError.message}`);
    }
  }
}

// Grava UMA tarefa do Asana (de topo ou subtarefa) como linha de `demands`
// e sincroniza seus vínculos de tag/campanha. `parentDemandId` é null pra
// tarefa de topo, ou o id da demanda pai quando `task` é uma subtarefa —
// é isso que faz a aba Demandas mostrar só o card pai e o detalhe da
// demanda listar as filhas com o status de cada uma.
//
// Existe um gatilho que gera `identificador` (DEM-YYYY-NNNN) só em INSERT.
// Um upsert "cego" dispararia esse gatilho pra toda linha, inclusive as
// que já existem e só vão virar UPDATE — desperdiçando números da
// sequence à toa e, se a sequence já estiver dessincronizada dos dados
// (ex: edição manual no Table Editor), gerando colisão. Por isso aqui a
// gente separa: linha que já existe (mesmo ministry_id + asana_task_gid)
// leva um UPDATE de verdade, sem tocar em identificador; só linha nova
// passa por INSERT. Campos preenchidos manualmente no portal (escopo,
// observação publicada etc.) não são tocados.
async function upsertTaskAsDemand(ministryId, task, campaignMap, parentDemandId) {
  const row = {
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
    parent_demand_id: parentDemandId,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: findError } = await withRetry(
    () =>
      supabase
        .from("demands")
        .select("id")
        .eq("ministry_id", row.ministry_id)
        .eq("asana_task_gid", row.asana_task_gid)
        .maybeSingle(),
    { label: `buscar demanda existente (${row.titulo})` }
  );

  if (findError) {
    throw new Error(`Erro ao verificar demanda existente (${row.titulo}): ${findError.message}`);
  }

  let demandId = existing?.id ?? null;

  if (existing) {
    const { error: updateError } = await withRetry(
      () => supabase.from("demands").update(row).eq("id", existing.id),
      { label: `atualizar demanda (${row.titulo})` }
    );
    if (updateError) {
      throw new Error(`Erro ao atualizar demanda ${row.titulo}: ${updateError.message}`);
    }
  } else {
    const { data: inserted, error: insertError } = await withRetry(
      () => supabase.from("demands").insert(row).select("id").single(),
      { label: `criar demanda (${row.titulo})` }
    );

    if (insertError) {
      throw new Error(`Erro ao criar demanda ${row.titulo}: ${insertError.message}`);
    }

    demandId = inserted.id;
  }

  const tagNames = (task.tags ?? []).map((tag) => tag.name).filter(Boolean);

  if (demandId && tagNames.length > 0) {
    const campaignIds = [];
    for (const tagName of tagNames) {
      const campaignId = await ensureCampaignId(ministryId, tagName, campaignMap);
      if (campaignId) campaignIds.push(campaignId);
    }
    await syncDemandCampaignLinks(demandId, campaignIds);
  } else if (demandId) {
    // tarefa ficou sem nenhuma tag — remove todos os vínculos antigos
    await syncDemandCampaignLinks(demandId, []);
  }

  return { demandId, completed: task.completed === true };
}

// Trava de segurança: uma hierarquia de subtarefas do Asana não deveria
// nunca chegar nem perto disso, mas evita recursão descontrolada (ex: se
// algum dado vier estranho) travar a sincronização inteira.
const MAX_SUBTASK_DEPTH = 15;

// Desce recursivamente a árvore de subtarefas: busca as subtarefas de
// `parentTaskGid`, grava cada uma com `parentDemandId` como pai, e repete
// pra CADA UMA delas (subtarefa da subtarefa, e assim por diante). `stats`
// é um objeto compartilhado só pra acumular contadores pro log final sem
// precisar somar retornos aninhados. Cada subtarefa é isolada num
// try/catch: se UMA falhar (ex: timeout persistente do Postgres mesmo
// depois do retry), ela é pulada e reportada no log, sem derrubar as
// outras — antes, uma tarefa problemática interrompia a sincronização do
// ministério inteiro (e de todos os ministérios seguintes na fila).
async function syncSubtasksRecursively(ministryId, parentTaskGid, parentDemandId, campaignMap, stats, depth = 0) {
  if (depth >= MAX_SUBTASK_DEPTH) {
    console.warn(`  Profundidade máxima (${MAX_SUBTASK_DEPTH}) atingida em ${parentTaskGid}, parando de descer aqui.`);
    return;
  }

  const subtasks = await fetchSubtasks(parentTaskGid);

  for (const st of subtasks) {
    try {
      const { demandId, completed } = await upsertTaskAsDemand(ministryId, st, campaignMap, parentDemandId);
      stats.demandCount++;
      stats.subtaskCount++;
      if (completed) stats.completedCount++;

      if (demandId) {
        await syncSubtasksRecursively(ministryId, st.gid, demandId, campaignMap, stats, depth + 1);
      }
    } catch (err) {
      console.error(`  Erro ao sincronizar subtarefa "${st.name}" (${st.gid}): ${err.message}. Pulando.`);
    }
  }
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
  // do quadro — ela é ignorada neste laço e só entra via
  // syncSubtasksRecursively, chamado a partir do pai verdadeiro. Sem esse
  // filtro, ela seria gravada duas vezes (uma vez como se fosse pai, outra
  // como filha de verdade) e, dependendo da ordem de processamento, o
  // vínculo certo podia ser sobrescrito de volta pra "sem pai".
  const tasks = allTasks.filter((t) => !t.parent);

  const stats = { demandCount: 0, completedCount: 0, subtaskCount: 0 };

  for (const t of tasks) {
    try {
      const { demandId, completed } = await upsertTaskAsDemand(ministryId, t, campaignMap, null);
      stats.demandCount++;
      if (completed) stats.completedCount++;

      if (demandId) {
        await syncSubtasksRecursively(ministryId, t.gid, demandId, campaignMap, stats);
      }
    } catch (err) {
      console.error(`  Erro ao sincronizar tarefa "${t.name}" (${t.gid}): ${err.message}. Pulando.`);
    }
  }

  const { demandCount, completedCount, subtaskCount } = stats;
  const openCount = demandCount - completedCount;

  await supabase
    .from("data_sources")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("ministry_id", ministryId)
    .eq("source", "asana");

  console.log(
    `  -> ${demandCount} demandas (${openCount} em produção, ${completedCount} concluídas, ${subtaskCount} são subtarefas).`
  );
}

// Trava manual (tabela `sync_lock`, migration 0020) pra impedir duas
// rodadas do sync correndo ao mesmo tempo — foi confirmado na prática que
// isso causa timeout em cascata (duas execuções brigando pela mesma linha
// da `demands`). O UPDATE é atômico: só "ganha" o cadeado quem conseguir
// mudar `locked` de false (ou destravado há mais de 1h, sinal de rodada
// anterior que morreu sem liberar) pra true numa única operação — se duas
// chamadas tentarem ao mesmo tempo, o banco serializa e só uma consegue.
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

    // Antes, um erro num ministério (ex: timeout no meio da lista) derrubava
    // o processo inteiro e nenhum ministério depois dele na fila chegava a
    // sincronizar naquela rodada. Agora cada ministério é isolado: se um
    // falhar, fica registrado no log e a rotina segue pros próximos — mas o
    // job ainda termina com status de erro (exit code 1) se algum falhou, pra
    // não mascarar o problema no painel do Render.
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
