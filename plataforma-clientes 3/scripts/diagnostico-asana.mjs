/* =========================================================================
   DIAGNÓSTICO — "por que o cron acha 1 tarefa se no Asana existem N?"
   -------------------------------------------------------------------------
   Este script NÃO grava nada. Ele só lê — do Asana e do banco — e responde,
   com número, onde as tarefas se perdem entre o Asana e o portal.

   Rode com o MESMO token que o cron do Render usa. Se rodar com outro
   token, o resultado responde sobre um mundo que não é o que o cron vê
   (permissão é uma das causas possíveis, e ela é por token).

     node scripts/diagnostico-asana.mjs                 # tag "Funday"
     node scripts/diagnostico-asana.mjs --tag=Natal
     node scripts/diagnostico-asana.mjs --json > relatorio.json

   A ideia é comparar DOIS universos:

     UNIVERSO A — tudo que o Asana tem com a tag, perguntando direto pela
                  tag (/tags/{gid}/tasks), que é escopo de WORKSPACE.
     UNIVERSO B — tudo que o cron consegue enxergar hoje, que é escopo de
                  PROJETO (data_sources.external_id) e ainda passa pelo
                  filtro de tarefas de topo.

   A diferença entre A e B é a resposta. Cada tarefa que está em A e não
   está em B sai da lista com o motivo do descarte ao lado.
   ========================================================================= */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { asanaFetch, asanaPaginado, contadores, ASANA_API } from "./asana-client.mjs";

const args = process.argv.slice(2);
const arg = (nome, padrao) => {
  const achado = args.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
};
const TAG = arg("tag", "Funday");
const SAIDA_JSON = args.includes("--json");
const PROJETOS_MANUAIS = arg("projetos", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const token = process.env.ASANA_ACCESS_TOKEN;
if (!token) {
  console.error("Falta ASANA_ACCESS_TOKEN no ambiente (.env.local ou env var do Render).");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Só o relatório vai pro stdout quando --json: assim dá pra redirecionar.
const log = SAIDA_JSON ? (...a) => console.error(...a) : (...a) => console.log(...a);
const titulo = (t) => {
  log("");
  log(t);
  log("-".repeat(t.length));
};

const normaliza = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const TASK_FIELDS = [
  "name",
  "completed",
  "parent.name",
  "projects.name",
  "projects.archived",
  "tags.name",
  "permalink_url",
].join(",");

const relatorio = {
  tag_procurada: TAG,
  gerado_em: new Date().toISOString(),
};

// =========================================================================
// ETAPA 1 — do NOME para o ID da tag
// =========================================================================
// O pedido é "tarefas com a tag Funday", mas a API trabalha com gid. Essa
// tradução é justamente onde mora um dos erros clássicos: DUAS tags com o
// mesmo nome (ou com acento/espaço diferente) em workspaces diferentes —
// aí "a tag Funday" tem 20 tarefas numa e 1 na outra, e quem olha pelo
// nome jura que é a mesma coisa.
async function resolverTag() {
  const { itens: workspaces } = await asanaPaginado("/workspaces", {
    token,
    optFields: "name",
    rotulo: "workspaces",
  });
  log(`Workspaces visíveis para este token: ${workspaces.length}`);
  for (const w of workspaces) log(`  • ${w.name} (${w.gid})`);

  const achadas = [];
  const parecidas = [];
  for (const w of workspaces) {
    const { itens: tags } = await asanaPaginado(`/workspaces/${w.gid}/tags`, {
      token,
      optFields: "name",
      rotulo: `tags de ${w.name}`,
    });
    for (const t of tags) {
      if (normaliza(t.name) === normaliza(TAG)) achadas.push({ ...t, workspace: w });
      else if (normaliza(t.name).includes(normaliza(TAG)) || normaliza(TAG).includes(normaliza(t.name)))
        parecidas.push({ ...t, workspace: w });
    }
  }

  return { workspaces, achadas, parecidas };
}

// =========================================================================
// ETAPA 3 — o escopo real do cron
// =========================================================================
async function escopoDoCron() {
  if (PROJETOS_MANUAIS.length > 0) {
    return PROJETOS_MANUAIS.map((gid) => ({ ministry_id: "(informado na linha de comando)", external_id: gid }));
  }
  if (!supabase) {
    log(
      "Sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY: não dá pra ler data_sources.\n" +
        "Passe os projetos na mão com --projetos=gid1,gid2 pra comparar mesmo assim."
    );
    return [];
  }
  const { data, error } = await supabase
    .from("data_sources")
    .select("ministry_id, external_id")
    .eq("source", "asana");
  if (error) {
    log(`Não consegui ler data_sources: ${error.message}`);
    return [];
  }
  return data ?? [];
}

// Cache de tarefas buscadas uma a uma (subida pela cadeia de pais).
const cacheTarefa = new Map();
async function buscarTarefa(gid) {
  if (cacheTarefa.has(gid)) return cacheTarefa.get(gid);
  const url = new URL(`${ASANA_API}/tasks/${gid}`);
  url.searchParams.set("opt_fields", TASK_FIELDS);
  let tarefa = null;
  try {
    const json = await asanaFetch(url, { token, rotulo: `tarefa ${gid}`, lista: false });
    tarefa = json.data;
  } catch (err) {
    log(`  (não consegui ler a tarefa ${gid}: ${err.message})`);
  }
  cacheTarefa.set(gid, tarefa);
  return tarefa;
}

// Sobe a cadeia de pais até a raiz. É isso que decide se o cron alcança
// uma tarefa: `collectTaskTree` começa nas tarefas de topo do projeto e
// desce pelas subtarefas — logo, uma tarefa só é alcançada se a RAIZ da
// cadeia dela estiver na lista de topo de algum projeto cadastrado.
const MAX_SUBIDA = 20;
async function cadeiaAteARaiz(tarefa) {
  const cadeia = [tarefa];
  let atual = tarefa;
  while (atual?.parent?.gid && cadeia.length < MAX_SUBIDA) {
    const pai = await buscarTarefa(atual.parent.gid);
    if (!pai) break;
    cadeia.push(pai);
    atual = pai;
  }
  return cadeia;
}

async function principal() {
  log(`DIAGNÓSTICO DA TAG "${TAG}" — ${new Date().toLocaleString("pt-BR")}`);

  // ---- ETAPA 1 --------------------------------------------------------
  titulo("ETAPA 1 — nome da tag -> ID da tag");
  const { workspaces, achadas, parecidas } = await resolverTag();

  if (parecidas.length > 0) {
    log("");
    log("Tags com nome PARECIDO (confira se não é uma dessas que está sendo usada):");
    for (const t of parecidas) log(`  ? "${t.name}" (${t.gid}) em ${t.workspace.name}`);
  }

  if (achadas.length === 0) {
    log("");
    log(`Nenhuma tag chamada "${TAG}" existe em nenhum workspace que este token enxerga.`);
    log("Isso já é a resposta: ou o nome está diferente no Asana, ou o token não tem acesso ao workspace certo.");
    relatorio.tags_encontradas = [];
    return relatorio;
  }

  log("");
  log(`Tags com esse nome exato: ${achadas.length}`);
  for (const t of achadas) log(`  ✓ "${t.name}" — ID ${t.gid} — workspace ${t.workspace.name} (${t.workspace.gid})`);
  if (achadas.length > 1) {
    log("");
    log("ATENÇÃO: existe MAIS DE UMA tag com esse nome. Trabalhar por nome aqui é ambíguo —");
    log("cada uma tem o seu próprio conjunto de tarefas. O portal precisa saber QUAL delas é a certa.");
  }

  relatorio.workspaces = workspaces.map((w) => ({ gid: w.gid, nome: w.name }));
  relatorio.tags_encontradas = achadas.map((t) => ({ gid: t.gid, nome: t.name, workspace: t.workspace.name }));
  relatorio.tags_parecidas = parecidas.map((t) => ({ gid: t.gid, nome: t.name, workspace: t.workspace.name }));

  // ---- ETAPA 2 --------------------------------------------------------
  titulo("ETAPA 2 — UNIVERSO A: o que o Asana tem com essa tag");
  const universoA = [];
  relatorio.universo_asana = [];

  for (const tag of achadas) {
    const { itens, paginas } = await asanaPaginado(`/tags/${tag.gid}/tasks`, {
      token,
      optFields: TASK_FIELDS,
      rotulo: `tarefas da tag ${tag.name}`,
    });
    log(`Tag ${tag.gid} ("${tag.name}", workspace ${tag.workspace.name}):`);
    log(`  páginas consultadas: ${paginas}`);
    log(`  tarefas retornadas: ${itens.length}`);
    const concluidas = itens.filter((t) => t.completed).length;
    const semProjeto = itens.filter((t) => (t.projects ?? []).length === 0).length;
    const subtarefas = itens.filter((t) => t.parent).length;
    const arquivadas = itens.filter((t) => (t.projects ?? []).some((p) => p.archived)).length;
    log(`  concluídas: ${concluidas} | em aberto: ${itens.length - concluidas}`);
    log(`  são subtarefas (têm pai): ${subtarefas}`);
    log(`  sem nenhum projeto: ${semProjeto}`);
    log(`  em pelo menos um projeto arquivado: ${arquivadas}`);
    for (const t of itens) universoA.push({ ...t, tagGid: tag.gid, tagNome: tag.name });
    relatorio.universo_asana.push({
      tag_gid: tag.gid,
      paginas,
      total: itens.length,
      concluidas,
      subtarefas,
      sem_projeto: semProjeto,
      em_projeto_arquivado: arquivadas,
    });
  }

  log("");
  log(`TOTAL no Asana com a tag "${TAG}": ${universoA.length} tarefa(s).`);
  log("");
  log("IDs encontrados:");
  for (const t of universoA) {
    const projs = (t.projects ?? []).map((p) => `${p.name}${p.archived ? " [arquivado]" : ""}`).join(", ") || "—";
    log(`  ${t.gid}  ${t.completed ? "[concluída]" : "[aberta]"}  ${t.name}`);
    log(`           projetos: ${projs}${t.parent ? `  | subtarefa de "${t.parent.name}" (${t.parent.gid})` : ""}`);
  }

  // ---- ETAPA 3 --------------------------------------------------------
  titulo("ETAPA 3 — UNIVERSO B: o que o cron enxerga hoje");
  const fontes = await escopoDoCron();
  log(`Projetos cadastrados em data_sources (source = 'asana'): ${fontes.length}`);
  for (const f of fontes) log(`  • projeto ${f.external_id} (ministério ${f.ministry_id})`);

  const porProjeto = new Map(); // projectGid -> { todas:Set, topo:Set, paginas }
  for (const f of fontes) {
    if (!f.external_id) {
      log(`  ! ministério ${f.ministry_id} está cadastrado SEM external_id — o cron pula esse ministério inteiro.`);
      continue;
    }
    try {
      const { itens, paginas } = await asanaPaginado(`/projects/${f.external_id}/tasks`, {
        token,
        optFields: "name,parent.name",
        rotulo: `tarefas do projeto ${f.external_id}`,
      });
      const todas = new Set(itens.map((t) => t.gid));
      const topo = new Set(itens.filter((t) => !t.parent).map((t) => t.gid));
      porProjeto.set(f.external_id, { todas, topo, paginas, ministryId: f.ministry_id });
      log(
        `  projeto ${f.external_id}: ${itens.length} tarefa(s) na listagem, ${topo.size} de topo, ` +
          `${itens.length - topo.size} descartada(s) pelo filtro \`!t.parent\` (${paginas} página(s))`
      );
    } catch (err) {
      log(`  ! projeto ${f.external_id}: ${err.message}`);
      log(`    (o cron trata isso como erro do ministério inteiro e pula todas as tarefas dele)`);
    }
  }

  // ---- ETAPA 4 --------------------------------------------------------
  titulo("ETAPA 4 — a diferença: o que o cron perde, e por quê");

  const alcancadas = [];
  const perdidas = [];

  for (const t of universoA) {
    const cadeia = await cadeiaAteARaiz(t);
    const raiz = cadeia[cadeia.length - 1];

    let alcancadaPor = null;
    for (const [projGid, dados] of porProjeto) {
      if (dados.topo.has(raiz.gid)) {
        alcancadaPor = projGid;
        break;
      }
    }

    if (alcancadaPor) {
      alcancadas.push({ tarefa: t, projeto: alcancadaPor, profundidade: cadeia.length - 1 });
      continue;
    }

    // Por que não foi alcançada?
    let motivo;
    const projetosDaTarefa = (t.projects ?? []).map((p) => p.gid);
    const emProjetoCadastrado = projetosDaTarefa.some((g) => porProjeto.has(g));
    const raizEmProjetoCadastrado = (raiz.projects ?? []).some((p) => porProjeto.has(p.gid));

    if (porProjeto.size === 0) {
      motivo = "não deu pra comparar: nenhum projeto cadastrado foi lido (veja a etapa 3)";
    } else if (!emProjetoCadastrado && projetosDaTarefa.length === 0 && !raizEmProjetoCadastrado) {
      motivo =
        "é subtarefa e nem ela nem a raiz da cadeia estão em projeto cadastrado — " +
        "o cron nunca desce até aqui";
    } else if (!emProjetoCadastrado && !raizEmProjetoCadastrado) {
      motivo =
        "está em projeto(s) do Asana que NÃO estão cadastrados em data_sources — " +
        "a tag é do workspace, mas o cron só olha projeto cadastrado";
    } else if (emProjetoCadastrado && t.parent) {
      motivo =
        "está num projeto cadastrado, MAS tem `parent` e a raiz da cadeia dela não é tarefa de topo " +
        "desse projeto — o filtro `!t.parent` joga ela fora e ninguém desce até ela (defeito A)";
    } else if (raizEmProjetoCadastrado) {
      motivo =
        "a raiz da cadeia está num projeto cadastrado mas não apareceu na listagem de topo " +
        "(tarefa arquivada, seção oculta ou sem permissão para este token)";
    } else {
      motivo = "não apareceu na listagem do projeto cadastrado (permissão ou projeto arquivado)";
    }

    perdidas.push({
      tarefa: t,
      motivo,
      raiz: raiz.gid === t.gid ? null : { gid: raiz.gid, nome: raiz.name },
    });
  }

  log(`Do universo A (${universoA.length}), o cron alcança ${alcancadas.length} e perde ${perdidas.length}.`);
  if (alcancadas.length > 0) {
    log("");
    log("ALCANÇADAS:");
    for (const a of alcancadas)
      log(`  ✓ ${a.tarefa.gid}  ${a.tarefa.name}  (projeto ${a.projeto}, profundidade ${a.profundidade})`);
  }
  if (perdidas.length > 0) {
    log("");
    log("PERDIDAS:");
    for (const p of perdidas) {
      log(`  ✗ ${p.tarefa.gid}  ${p.tarefa.name}`);
      log(`      motivo: ${p.motivo}`);
      if (p.raiz) log(`      raiz da cadeia: "${p.raiz.nome}" (${p.raiz.gid})`);
    }
    log("");
    const porMotivo = new Map();
    for (const p of perdidas) porMotivo.set(p.motivo, (porMotivo.get(p.motivo) ?? 0) + 1);
    log("Resumo dos motivos:");
    for (const [m, n] of [...porMotivo].sort((a, b) => b[1] - a[1])) log(`  ${n}x — ${m}`);
  }

  relatorio.alcancadas = alcancadas.map((a) => ({ gid: a.tarefa.gid, nome: a.tarefa.name, projeto: a.projeto }));
  relatorio.perdidas = perdidas.map((p) => ({ gid: p.tarefa.gid, nome: p.tarefa.name, motivo: p.motivo }));

  // ---- ETAPA 5 --------------------------------------------------------
  titulo("ETAPA 5 — o que chegou no banco (e o que o portal mostra)");
  if (!supabase) {
    log("Sem credenciais do Supabase — etapa pulada.");
  } else {
    const gids = universoA.map((t) => t.gid);
    const encontradas = [];
    for (let i = 0; i < gids.length; i += 200) {
      const { data, error } = await supabase
        .from("demands")
        .select("id, titulo, asana_task_gid, ministry_id, status")
        .in("asana_task_gid", gids.slice(i, i + 200));
      if (error) {
        log(`Erro ao ler demands: ${error.message}`);
        break;
      }
      encontradas.push(...(data ?? []));
    }
    log(`Tarefas da tag que existem como demanda no banco: ${encontradas.length}/${gids.length}`);
    const faltando = gids.filter((g) => !encontradas.some((d) => d.asana_task_gid === g));
    if (faltando.length > 0) log(`Não estão no banco: ${faltando.join(", ")}`);

    const { data: campanhas, error: erroCamp } = await supabase
      .from("campaigns")
      .select("id, nome, publicada, origem, ministry_id")
      .ilike("nome", `%${TAG}%`);
    if (erroCamp) {
      log(`Erro ao ler campaigns: ${erroCamp.message}`);
    } else {
      log("");
      log(`Campanhas no banco com nome parecido com "${TAG}": ${campanhas?.length ?? 0}`);
      for (const c of campanhas ?? []) {
        const { count } = await supabase
          .from("demand_campaigns")
          .select("demand_id", { count: "exact", head: true })
          .eq("campaign_id", c.id);
        log(
          `  • "${c.nome}" (${c.id}) — origem ${c.origem} — ${c.publicada ? "PUBLICADA" : "PENDENTE (escondida do ministério)"} — ${count ?? 0} demanda(s) vinculada(s)`
        );
      }
      if ((campanhas?.length ?? 0) > 1) {
        log("");
        log("Mais de uma campanha com esse nome: é o sintoma de tag casada por NOME em vez de ID —");
        log("renomear a tag no Asana cria uma campanha nova e deixa a antiga órfã (defeito C).");
      }
      const pendentes = (campanhas ?? []).filter((c) => !c.publicada);
      if (pendentes.length > 0) {
        log("");
        log("Campanha PENDENTE não aparece para o ministério até ser aberta em");
        log("/dashboard/admin/campanhas-pendentes — se o cron trouxer 20 tarefas e a campanha");
        log("continuar pendente, o front-end segue mostrando nada (ou só o que veio por outro caminho).");
      }
      relatorio.campanhas = campanhas ?? [];
    }
    relatorio.demandas_no_banco = encontradas.length;
    relatorio.gids_ausentes_no_banco = faltando;
  }

  // ---- ETAPA 6 --------------------------------------------------------
  titulo("ETAPA 6 — custo das chamadas");
  log(`requisições ao Asana: ${contadores.requisicoes}`);
  log(`páginas percorridas:  ${contadores.paginas}`);
  log(`esperas por limite de taxa (429): ${contadores.esperasPorLimite}`);
  log(`novas tentativas (rede/5xx): ${contadores.novasTentativas}`);
  log(`tempo total esperando: ${(contadores.msEsperando / 1000).toFixed(1)}s`);
  relatorio.chamadas = { ...contadores };

  return relatorio;
}

principal()
  .then((r) => {
    if (SAIDA_JSON) console.log(JSON.stringify(r, null, 2));
  })
  .catch((err) => {
    console.error("");
    console.error(`O diagnóstico parou: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
