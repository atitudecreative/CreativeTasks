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

// Busca as campanhas já cadastradas pro ministério e monta um mapa
// nome (minúsculo) -> id, pra não criar campanha duplicada a cada sync.
async function loadCampaignMap(ministryId) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, nome")
    .eq("ministry_id", ministryId);

  if (error) {
    throw new Error(`Erro ao buscar campanhas do ministério ${ministryId}: ${error.message}`);
  }

  const map = new Map();
  for (const c of data ?? []) map.set(c.nome.trim().toLowerCase(), c.id);
  return map;
}

// Tags do Asana viram campanhas/eventos no portal: a primeira tag de
// cada tarefa é usada como campanha (cria a campanha se ainda não
// existir uma com esse nome nesse ministério). Tarefas sem tag ficam
// sem campanha vinculada.
async function ensureCampaignId(ministryId, tagName, campaignMap) {
  const key = tagName.trim().toLowerCase();
  if (campaignMap.has(key)) return campaignMap.get(key);

  const { data, error } = await supabase
    .from("campaigns")
    .insert({ ministry_id: ministryId, nome: tagName.trim(), tipo: "campanha" })
    .select("id")
    .single();

  if (error) {
    console.warn(`  Não consegui criar a campanha "${tagName}": ${error.message}`);
    return null;
  }

  campaignMap.set(key, data.id);
  console.log(`  + Nova campanha criada a partir da tag do Asana: "${tagName.trim()}"`);
  return data.id;
}

async function syncMinistry(dataSource) {
  const { ministry_id: ministryId, external_id: projectGid } = dataSource;

  if (!projectGid) {
    console.warn(
      `Ministério ${ministryId}: data_sources sem external_id (gid do projeto Asana). Pulando.`
    );
    return;
  }

  console.log(`Sincronizando projeto Asana ${projectGid} (ministério ${ministryId})...`);

  const tasks = await fetchAllTasks(projectGid);
  const campaignMap = await loadCampaignMap(ministryId);

  const rows = [];
  for (const t of tasks) {
    const row = {
      ministry_id: ministryId,
      asana_task_gid: t.gid,
      titulo: t.name,
      status: t.completed ? "concluida" : "em_producao",
      prazo_acordado: t.due_on ?? null,
      link_origem: t.permalink_url ?? null,
      observacao_interna: t.assignee?.name
        ? `Sincronizado do Asana. Responsável no Asana: ${t.assignee.name}.`
        : "Sincronizado do Asana.",
      fonte_externa: "asana",
      updated_at: new Date().toISOString(),
    };

    // primeira tag da tarefa vira a campanha/evento vinculado
    const tagName = t.tags?.[0]?.name;
    if (tagName) {
      const campaignId = await ensureCampaignId(ministryId, tagName, campaignMap);
      if (campaignId) row.campaign_id = campaignId;
    }

    rows.push(row);
  }

  if (rows.length > 0) {
    // upsert por (ministry_id, asana_task_gid) — ver unique constraint na migration 0004.
    // status e prazo são sobrescritos a cada sync; campos preenchidos manualmente
    // no portal (escopo, observação publicada, campanha vinculada etc.) não são tocados.
    for (const row of rows) {
      const { error: upsertError } = await supabase
        .from("demands")
        .upsert(row, { onConflict: "ministry_id,asana_task_gid" });

      if (upsertError) {
        throw new Error(`Erro ao gravar demanda ${row.titulo}: ${upsertError.message}`);
      }
    }
  }

  const completedCount = rows.filter((r) => r.status === "concluida").length;
  const openCount = rows.length - completedCount;

  await supabase
    .from("data_sources")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("ministry_id", ministryId)
    .eq("source", "asana");

  console.log(
    `  -> ${rows.length} demandas (${openCount} em produção, ${completedCount} concluídas).`
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

  for (const source of sources) {
    await syncMinistry(source);
  }

  console.log("Sincronização com o Asana concluída.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
