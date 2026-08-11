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

// Todas as tags de uma tarefa do Asana viram campanhas/eventos no portal —
// uma demanda pode estar em várias campanhas ao mesmo tempo (tabela
// demand_campaigns). Cada tag cria (se ainda não existir) uma campanha
// "pendente" (publicada = false) — ela só aparece pro ministério depois
// que a Comunicação revisa e "abre" o evento em
// /dashboard/admin/campanhas-pendentes. Tarefas sem tag ficam sem
// campanha vinculada.
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

  // rows: cada item guarda a linha pra gravar em `demands` + a lista de
  // nomes de tag da tarefa (separado, porque tag não é mais coluna da
  // linha — vira registro em demand_campaigns depois que sabemos o id).
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

    const tagNames = (t.tags ?? []).map((tag) => tag.name).filter(Boolean);

    rows.push({ row, tagNames });
  }

  if (rows.length > 0) {
    // Existe um gatilho que gera `identificador` (DEM-YYYY-NNNN) só em
    // INSERT. Um upsert "cego" dispararia esse gatilho pra toda linha,
    // inclusive as que já existem e só vão virar UPDATE — desperdiçando
    // números da sequence à toa e, se a sequence já estiver
    // dessincronizada dos dados (ex: edição manual no Table Editor),
    // gerando colisão. Por isso aqui a gente separa: linha que já existe
    // (mesmo ministry_id + asana_task_gid) leva um UPDATE de verdade, sem
    // tocar em identificador; só linha nova passa por INSERT. Campos
    // preenchidos manualmente no portal (escopo, observação publicada
    // etc.) não são tocados.
    for (const { row, tagNames } of rows) {
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
        const { error: updateError } = await supabase
          .from("demands")
          .update(row)
          .eq("id", existing.id);

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
    }
  }

  const completedCount = rows.filter((r) => r.row.status === "concluida").length;
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
