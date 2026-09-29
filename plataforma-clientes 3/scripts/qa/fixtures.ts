/* Dados de mentira, escolhidos pelos casos que quebram layout: nome
   comprido, valor de sete dígitos, lista vazia, campo nulo, número que
   não bate. Não é uma amostra "bonita" — é uma amostra difícil. */

export const MINISTRY = {
  id: "min-1",
  name: "Ministério de Comunicação e Cultura",
  slug: "comunicacao",
  sigla: "MCC",
  description: "Comunicação institucional, eventos e conteúdo.",
  categoria: "ministerio",
  status: "ativo",
  capa_url: null as string | null,
  brand_color: null as string | null,
  walnut_color: null as string | null,
};

export const MINISTRIES = [
  MINISTRY,
  { ...MINISTRY, id: "min-2", name: "Rede de Jovens", slug: "jovens", sigla: "RJ" },
  { ...MINISTRY, id: "min-3", name: "Ação Social", slug: "acao-social", sigla: "AS" },
];

const HOJE = new Date();
const dia = (delta: number) => {
  const d = new Date(HOJE.getTime() + delta * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

export const CAMPAIGNS = [
  {
    id: "camp-1", identificador: "CAMP-001", ministry_id: "min-1",
    nome: "Festa da Roça 2026 — edição de aniversário",
    tipo: "evento", fase: "distribuicao_execucao", saude: "no_caminho",
    data_inicio: dia(-40), data_termino: dia(20), data_evento: dia(18),
    orcamento_planejado: 45000, orcamento_aprovado: 42000, investimento_realizado: 31480,
    publicada: true, origem: "asana", folder_id: null, posicao: 0, capa_url: null,
    objetivo_estrategico: "Reunir a comunidade e arrecadar para a obra social.",
    escopo_macro: null, resultados_observacoes: null,
  },
  {
    id: "camp-2", identificador: "CAMP-002", ministry_id: "min-1",
    nome: "Culto de Páscoa", tipo: "evento", fase: "encerramento_aprendizado", saude: "concluida",
    data_inicio: dia(-120), data_termino: dia(-90), data_evento: dia(-95),
    orcamento_planejado: 18000, orcamento_aprovado: 18000, investimento_realizado: 1284930,
    publicada: true, origem: "asana", folder_id: null, posicao: 1, capa_url: null,
  },
  {
    id: "camp-3", identificador: "CAMP-003", ministry_id: "min-1",
    nome: "Campanha do Agasalho", tipo: "campanha", fase: "planejamento", saude: "critica",
    data_inicio: dia(5), data_termino: dia(60), data_evento: null,
    orcamento_planejado: null, orcamento_aprovado: null, investimento_realizado: null,
    publicada: true, origem: "manual", folder_id: null, posicao: 2, capa_url: null,
  },
  // A galeria de campanhas mostra quatro colunas: com três itens nunca se
  // veria a quarta, nem a segunda fileira. Estas completam a grade e
  // cobrem os dois estados da capa — com imagem e sem.
  ...["Semana da Família", "Encontro de Casais", "Missões Urbanas", "Natal Solidário", "Retiro de Jovens", "Ação de Graças"].map(
    (nome, i) => ({
      id: `camp-${i + 4}`,
      identificador: `CAMP-${String(i + 4).padStart(3, "0")}`,
      ministry_id: "min-1",
      nome,
      tipo: i % 2 === 0 ? "evento" : "campanha",
      fase: ["planejamento", "criacao", "producao", "distribuicao_execucao"][i % 4],
      saude: ["no_caminho", "atencao", "no_caminho", "concluida", "critica", "no_caminho"][i],
      data_inicio: dia(-60 + i * 12),
      data_termino: dia(-20 + i * 12),
      data_evento: i % 3 === 0 ? dia(-25 + i * 12) : null,
      orcamento_planejado: 12000 + i * 3000,
      orcamento_aprovado: 12000 + i * 2500,
      investimento_realizado: i % 4 === 0 ? null : 8000 + i * 1900,
      publicada: true,
      origem: "manual",
      folder_id: null,
      posicao: 3 + i,
      // Capa em data: URI — imagem de verdade, sem depender de rede (o
      // ambiente de QA não alcança host externo). Alternadas com null para
      // a grade mostrar os dois estados lado a lado.
      capa_url:
        i % 2 === 0
          ? `data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a4b2a"/><stop offset="1" stop-color="#d9a066"/></linearGradient></defs><rect width="300" height="200" fill="url(#g)"/><circle cx="${60 + i * 30}" cy="90" r="46" fill="#ffffff" opacity="0.14"/></svg>`
            )}`
          : null,
    })
  ),
];

// Um evento no período ANTERIOR ao dos últimos 3 meses, com mídia paga:
// sem ele a Home não teria contra o que comparar semana a semana, e a
// comparação atual × anterior nunca apareceria na revisão visual.
CAMPAIGNS.push({
  id: "camp-10", identificador: "CAMP-010", ministry_id: "min-1",
  nome: "Conferência de Líderes", tipo: "evento", fase: "encerramento_aprendizado", saude: "concluida",
  data_inicio: dia(-160), data_termino: dia(-118), data_evento: dia(-120),
  orcamento_planejado: 15000, orcamento_aprovado: 14000, investimento_realizado: null,
  publicada: true, origem: "manual", folder_id: null, posicao: 9, capa_url: null,
} as (typeof CAMPAIGNS)[number]);

const STATUSES = [
  "recebida", "em_triagem", "planejada", "em_producao", "em_revisao_interna",
  "aguardando_ministerio", "aguardando_aprovacao", "ajustes_solicitados",
  "aprovada", "agendada_ou_publicada", "concluida", "pausada", "cancelada",
];

export const DEMANDS = Array.from({ length: 34 }, (_, i) => ({
  id: `dem-${i}`,
  identificador: `DEM-${String(i + 1).padStart(3, "0")}`,
  ministry_id: "min-1",
  campaign_id: i % 3 === 0 ? "camp-1" : i % 5 === 0 ? "camp-2" : null,
  parent_demand_id: null,
  titulo:
    i === 0
      ? "Peça de divulgação para o telão do templo, versão vertical e horizontal, com legenda acessível"
      : `Arte ${i + 1} — ${["post", "story", "banner", "convite", "vídeo"][i % 5]}`,
  tipo_servico: ["design", "video", "social", "impresso"][i % 4],
  prioridade: ["baixa", "media", "alta", "urgente"][i % 4],
  status: STATUSES[i % STATUSES.length],
  // Espalha os prazos entre cinco meses atrás e dois à frente, e deixa
  // algumas sem prazo nenhum.
  prazo_acordado: i % 7 === 0 ? null : dia(Math.round((i - 20) * 4.6)),
  data_conclusao: i % 5 === 0 ? dia(-3) : null,
  data_solicitacao: dia(-60),
  data_inicio: i % 4 === 0 ? null : dia(-40),
  pendencia_atual: i % 6 === 0 ? "Aguardando texto final do ministério." : null,
  observacao_publicada: null,
  fonte_externa: "asana",
  link_origem: "https://app.asana.com/0/0/0",
  updated_at: new Date().toISOString(),
  descricao_objetiva: "Descrição objetiva da demanda, escrita pela Comunicação.",
  escopo_acordado: null,
  dependencias: null,
}));

export const DELIVERABLES = Array.from({ length: 9 }, (_, i) => ({
  id: `ent-${i}`,
  ministry_id: "min-1",
  campaign_id: i % 2 === 0 ? "camp-1" : null,
  demand_id: i < 3 ? `dem-${i}` : null,
  titulo: `Material ${i + 1} — arte final aprovada para veiculação`,
  tipo_arquivo: ["imagem", "video", "pdf"][i % 3],
  versao: `${i % 3}.0`,
  status: ["rascunho", "para_aprovacao", "aprovado"][i % 3],
  data_entrega: dia(-i * 2),
  link_principal: "https://drive.google.com/file/d/exemplo/view",
  links_complementares: i === 0 ? ["https://www.youtube.com/watch?v=exemplo"] : [],
  observacao_uso: null,
}));

export const MILESTONES = [
  { id: "mar-1", nome: "Briefing aprovado", peso: 1, concluido: true, data_prevista: dia(-30), data_conclusao: dia(-31) },
  { id: "mar-2", nome: "Identidade visual", peso: 2, concluido: true, data_prevista: dia(-15), data_conclusao: dia(-14) },
  { id: "mar-3", nome: "Peças de divulgação", peso: 3, concluido: false, data_prevista: dia(5), data_conclusao: null },
  { id: "mar-4", nome: "Cobertura do evento", peso: 2, concluido: false, data_prevista: dia(19), data_conclusao: null },
];

export const META_AD_CAMPAIGNS = [
  {
    id: "meta-1", meta_campaign_id: "1200000", meta_ad_account_id: "act_1",
    nome: "Festa da Roça — Tráfego", status: "ACTIVE", campaign_id: "camp-1",
    matched_manualmente: false, alcance: 48210, impressoes: 132400, cliques: 3972,
    investimento: 8430.5, vendas: 214, data_inicio: dia(-40), data_termino: dia(20),
    synced_at: new Date().toISOString(),
  },
  {
    id: "meta-2", meta_campaign_id: "1200001", meta_ad_account_id: "act_1",
    nome: "Festa da Roça — Conversão", status: "ACTIVE", campaign_id: "camp-1",
    matched_manualmente: true, alcance: 21050, impressoes: 60120, cliques: 1544,
    investimento: 4210.25, vendas: null, data_inicio: dia(-30), data_termino: dia(20),
    synced_at: new Date().toISOString(),
  },
  {
    id: "meta-3", meta_campaign_id: "1200002", meta_ad_account_id: "act_1",
    nome: "Conferência de Líderes — Inscrições", status: "PAUSED", campaign_id: "camp-10",
    matched_manualmente: false, alcance: 31200, impressoes: 88000, cliques: 2140,
    investimento: 9660, vendas: 141, data_inicio: dia(-160), data_termino: dia(-118),
    synced_at: new Date().toISOString(),
  },
];

export const META_ADS = Array.from({ length: 6 }, (_, i) => ({
  id: `ad-${i}`, meta_ad_id: `ad${i}`, meta_campaign_id: "1200000",
  nome: `Criativo ${i + 1} — ${["carrossel", "vídeo 15s", "estático"][i % 3]}`,
  investimento: 1800 - i * 220, impressoes: 30000 - i * 3800, cliques: 900 - i * 110,
  ctr: 3 - i * 0.2, cpc: 2 + i * 0.3, cpm: 60 + i * 4, vendas: i < 3 ? 60 - i * 12 : null,
}));

export const META_WEEKLY = Array.from({ length: 8 }, (_, i) => ({
  meta_campaign_id: "1200000",
  semana_inicio: dia(-56 + i * 7),
  semana_fim: dia(-50 + i * 7),
  investimento: 900 + i * 180,
  impressoes: 12000 + i * 2400,
  cliques: 340 + i * 60,
  vendas: i > 1 ? 18 + i * 3 : null,
}));

// Seis semanas da Conferência (período anterior): verba parecida, retorno
// menor — é o que dá à comparação algo para mostrar.
META_WEEKLY.push(
  ...Array.from({ length: 6 }, (_, i) => ({
    meta_campaign_id: "1200002",
    semana_inicio: dia(-160 + i * 7),
    semana_fim: dia(-154 + i * 7),
    investimento: 1350 + i * 110,
    impressoes: 13000 + i * 800,
    cliques: 320 + i * 25,
    vendas: 16 + ((i * 7) % 11),
  }))
);

export const META_DEMOGRAFIA = [
  { meta_campaign_id: "1200000", tipo: "genero", chave: "female", investimento: 7200, vendas: 132 },
  { meta_campaign_id: "1200000", tipo: "genero", chave: "male", investimento: 5400, vendas: 82 },
  { meta_campaign_id: "1200000", tipo: "idade", chave: "25-34", investimento: 4800, vendas: 91 },
  { meta_campaign_id: "1200000", tipo: "idade", chave: "35-44", investimento: 3900, vendas: 64 },
  { meta_campaign_id: "1200000", tipo: "idade", chave: "18-24", investimento: 2100, vendas: 38 },
  { meta_campaign_id: "1200000", tipo: "idade", chave: "45-54", investimento: 1800, vendas: 21 },
  { meta_campaign_id: "1200002", tipo: "genero", chave: "female", investimento: 4700, vendas: 70 },
  { meta_campaign_id: "1200002", tipo: "genero", chave: "male", investimento: 4960, vendas: 71 },
  { meta_campaign_id: "1200002", tipo: "idade", chave: "25-34", investimento: 3600, vendas: 58 },
  { meta_campaign_id: "1200002", tipo: "idade", chave: "35-44", investimento: 3300, vendas: 46 },
  { meta_campaign_id: "1200002", tipo: "idade", chave: "45-54", investimento: 2760, vendas: 37 },
];

export const COMMENTS = [
  {
    id: "com-1", demand_id: "dem-0", author_id: "user-1",
    corpo: "Time, a versão vertical ficou ótima. Podemos ajustar só o tamanho da legenda?",
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    profiles: { full_name: "Ana Ribeiro" },
  },
  {
    id: "com-2", demand_id: "dem-0", author_id: "user-2",
    corpo: "Ajustado e reenviado.",
    created_at: new Date(Date.now() - 900_000).toISOString(),
    profiles: { full_name: null },
  },
];


/* -------------------------------------------------------------------------
   Subtarefas em escala
   -------------------------------------------------------------------------
   O sync do Asana já trouxe para esta base uma tarefa guarda-chuva com mais
   de 1.500 filhas. Cento e vinte aqui já reproduz o que interessa para o
   layout: a lista precisa de busca, recorte e carregamento por lote, e a
   página tem que abrir rápido mesmo assim.
   ------------------------------------------------------------------------- */
export const SUBDEMANDS = Array.from({ length: 120 }, (_, i) => ({
  id: `sub-${i}`,
  identificador: `DEM-S${String(i + 1).padStart(3, "0")}`,
  ministry_id: "min-1",
  campaign_id: null as string | null,
  parent_demand_id: "dem-0",
  titulo: `Peça ${i + 1} do pacote — ${["post", "story", "banner", "convite", "vídeo"][i % 5]}`,
  tipo_servico: ["design", "video", "social", "impresso"][i % 4],
  prioridade: ["baixa", "media", "alta", "urgente"][i % 4],
  status: STATUSES[i % STATUSES.length],
  prazo_acordado: i % 9 === 0 ? null : dia(Math.round((i - 60) * 1.1)),
  data_conclusao: i % 5 === 0 ? dia(-3) : null,
  data_solicitacao: dia(-50),
  data_inicio: dia(-30),
  pendencia_atual: null as string | null,
  observacao_publicada: null as string | null,
  fonte_externa: "asana",
  link_origem: "https://app.asana.com/0/0/0",
  updated_at: new Date().toISOString(),
  descricao_objetiva: null as string | null,
  escopo_acordado: null as string | null,
  dependencias: null as string | null,
}));

/* -------------------------------------------------------------------------
   Histórico de status (audit_log, migration 0030)
   -------------------------------------------------------------------------
   `profiles` embutido porque é assim que o PostgREST devolve o vínculo, e
   uma das linhas vem sem autor de propósito: é a escrita do sync, que roda
   com service role e chega com auth.uid() nulo.
   ------------------------------------------------------------------------- */
const horasAtras = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const AUDIT_LOG = [
  ["recebida", "em_triagem", 300, "Ana Ribeiro"],
  ["em_triagem", "planejada", 240, "Ana Ribeiro"],
  ["planejada", "em_producao", 180, null],
  ["em_producao", "em_revisao_interna", 60, "Ana Ribeiro"],
  ["em_revisao_interna", "aguardando_aprovacao", 30, "Ana Ribeiro"],
  ["aguardando_aprovacao", "ajustes_solicitados", 6, "João Pereira da Silva Santos"],
].map(([de, para, h, autor], i) => ({
  id: `log-${i}`,
  acao: "mudanca_status",
  entidade_tipo: "demands",
  entidade_id: "dem-0",
  valor_anterior: { status: de as string },
  valor_novo: { status: para as string },
  created_at: horasAtras(h as number),
  profiles: autor ? { full_name: autor as string } : null,
}));
