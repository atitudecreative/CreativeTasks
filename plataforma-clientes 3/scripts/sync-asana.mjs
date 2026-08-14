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

const ASANA_API = "https://app.asana.com/api/1.0";
const TASK_FIELDS = "name,completed,assignee.name,due_on,permalink_url,notes,tags.name";

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

  const { data: existing, error: findError } = await supabase
    .from("demands")
    .select("id")
    .eq("ministry_id", row.ministry_id)
    .eq("asana_task_gid", row.asana_task_gid)
    .maybeSingle();

  if (findError) {
    throw new Error(`Erro ao verificar demanda existente (${row.titulo}): ${findError.message}`);
  }

  let demandId = existing?.id ?? null;

  if (existing) {
    const { error: updateError } = await supabase.from("demands").update(row).eq("id", existing.id);
    if (updateError) {
      throw new Error(`Erro ao atualizar demanda ${row.titulo}: ${updateError.message}`);
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("demands")
      .insert(row)
      .select("id")
      .single();

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

async function syncMinistry(dataSource, campaignMap) {
  const { ministry_id: ministryId, external_id: projectGid } = dataSource;

  if (!projectGid) {
    console.warn(
      `Ministério ${ministryId}: data_sources sem external_id (gid do projeto Asana). Pulando.`
    );
    return;
  }

  console.log(`Sincronizando projeto Asana ${projectGid} (ministério ${ministryId})...`);

  const tasks = await fetchAllTasks(projectGid);

  let demandCount = 0;
  let completedCount = 0;
  let subtaskCount = 0;

  for (const t of tasks) {
    const { demandId, completed } = await upsertTaskAsDemand(ministryId, t, campaignMap, null);
    demandCount++;
    if (completed) completedCount++;

    if (!demandId) continue;

    // Subtarefas do Asana ("demandas filhas") não vêm na listagem de
    // primeiro nível — precisam de uma chamada por tarefa pai.
    const subtasks = await fetchSubtasks(t.gid);
    for (const st of subtasks) {
      const { completed: subCompleted } = await upsertTaskAsDemand(ministryId, st, campaignMap, demandId);
      demandCount++;
      subtaskCount++;
      if (subCompleted) completedCount++;
    }
  }

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

async function main() {
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

  for (const source of sources) {
    await syncMinistry(source, campaignMap);
  }

  console.log("Sincronização com o Asana concluída.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
