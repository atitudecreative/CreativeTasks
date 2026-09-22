/* =========================================================================
   SUPABASE DE MENTIRA — só o transporte
   -------------------------------------------------------------------------
   Substitui `createClient()` de @/lib/supabase/server quando QA_MOCK=1.
   Devolve um construtor de consulta encadeável que registra os filtros e,
   no `await`, entrega as linhas do fixture da tabela pedida.

   O que ele NÃO é: uma reimplementação do PostgREST. Ele suporta
   exatamente as operações que este projeto usa, e nada além. Quando uma
   tela precisar de algo novo, o mock quebra alto (tabela sem fixture
   devolve erro explícito) em vez de devolver lista vazia e simular um
   estado que não existe — que é justamente o defeito que esta auditoria
   foi corrigir na camada de dados de verdade.
   ========================================================================= */

import * as F from "./fixtures.ts";

type Linha = Record<string, unknown>;
type Filtro = { op: string; coluna: string; valor: unknown };

const SEM_FIXTURE = Symbol("sem fixture");

function tabela(nome: string): Linha[] | typeof SEM_FIXTURE {
  switch (nome) {
    case "ministries": return F.MINISTRIES as unknown as Linha[];
    case "ministry_members":
      return [
        ...F.MINISTRIES.map((m) => ({ ministry_id: m.id, user_id: "user-1", role: "supervisor", ministries: m })),
        { ministry_id: "min-1", user_id: "user-2", role: "aprovador", ministries: F.MINISTRIES[0] },
        { ministry_id: "min-2", user_id: "user-3", role: "leitor", ministries: F.MINISTRIES[1] },
      ] as unknown as Linha[];
    case "profiles":
      return [
        { id: "user-1", full_name: "Ana Ribeiro", papel_global: "gestor_comunicacao", brand_color: null, walnut_color: null },
        { id: "user-2", full_name: "João Pereira da Silva Santos", papel_global: "nenhum", brand_color: null, walnut_color: null },
        { id: "user-3", full_name: null, papel_global: "atendimento", brand_color: null, walnut_color: null },
      ];
    case "demands": return F.DEMANDS as unknown as Linha[];
    case "campaigns": return F.CAMPAIGNS as unknown as Linha[];
    case "deliverables": return F.DELIVERABLES as unknown as Linha[];
    case "milestones": return F.MILESTONES.map((m) => ({ ...m, campaign_id: "camp-1", ordem: 0 })) as unknown as Linha[];
    case "demand_campaigns":
      return F.DEMANDS.filter((d) => d.campaign_id).map((d) => ({
        demand_id: d.id, campaign_id: d.campaign_id,
        demands: { ministry_id: d.ministry_id },
        campaigns: F.CAMPAIGNS.find((c) => c.id === d.campaign_id),
      })) as unknown as Linha[];
    case "campaign_ministries": return [{ campaign_id: "camp-3", ministry_id: "min-1" }];
    case "campaign_folders": return [{ id: "pasta-1", nome: "Eventos recorrentes", posicao: 0 }];
    case "demand_comments": return F.COMMENTS as unknown as Linha[];
    case "meta_ad_campaigns": return F.META_AD_CAMPAIGNS as unknown as Linha[];
    case "meta_ads": return F.META_ADS as unknown as Linha[];
    case "meta_ad_campaign_weekly": return F.META_WEEKLY as unknown as Linha[];
    case "meta_ad_campaign_demografia": return F.META_DEMOGRAFIA as unknown as Linha[];
    case "campanha_perfil":
      return F.CAMPAIGNS.map((c) => {
        const midia = F.META_AD_CAMPAIGNS.filter((m) => m.campaign_id === c.id);
        const investimentoMidia = midia.length ? midia.reduce((s, m) => s + (m.investimento ?? 0), 0) : null;
        const impressoes = midia.reduce((s, m) => s + (m.impressoes ?? 0), 0) || null;
        const cliques = midia.reduce((s, m) => s + (m.cliques ?? 0), 0) || null;
        const vendas = midia.some((m) => m.vendas != null)
          ? midia.reduce((s, m) => s + (m.vendas ?? 0), 0) : null;
        const demandas = F.DEMANDS.filter((d) => d.campaign_id === c.id);
        return {
          id: c.id, ministry_id: c.ministry_id, nome: c.nome, tipo: c.tipo, fase: c.fase,
          saude: c.saude, publicada: c.publicada,
          data_referencia: c.data_evento ?? c.data_termino ?? c.data_inicio,
          orcamento_planejado: c.orcamento_planejado, orcamento_aprovado: c.orcamento_aprovado,
          investimento: investimentoMidia ?? c.investimento_realizado,
          alcance: midia.reduce((s, m) => s + (m.alcance ?? 0), 0) || null,
          impressoes, cliques, vendas,
          ctr: impressoes ? ((cliques ?? 0) / impressoes) * 100 : null,
          cpc: cliques ? (investimentoMidia ?? 0) / cliques : null,
          cpm: impressoes ? ((investimentoMidia ?? 0) / impressoes) * 1000 : null,
          cpa: vendas ? (investimentoMidia ?? 0) / vendas : null,
          demandas_total: demandas.length,
          demandas_concluidas: demandas.filter((d) => d.status === "concluida").length,
          demandas_com_prazo_aferivel: demandas.filter((d) => d.prazo_acordado && d.data_conclusao).length,
          demandas_no_prazo: demandas.filter((d) => d.prazo_acordado && d.data_conclusao && d.data_conclusao <= d.prazo_acordado).length,
          ciclo_mediano_dias: c.id === "camp-1" ? 12 : null,
          entregas_total: F.DELIVERABLES.filter((d) => d.campaign_id === c.id).length,
          progresso_marcos: c.id === "camp-1" ? 38 : null,
        };
      }) as unknown as Linha[];
    case "asana_secoes": return [
      { id: "s1", ministry_id: "min-1", secao: "Em Arte", secao_normalizada: "em arte", total_tarefas: 8, vista_em: new Date().toISOString() },
      { id: "s2", ministry_id: "min-1", secao: "Com o Ministério", secao_normalizada: "com o ministerio", total_tarefas: 3, vista_em: new Date().toISOString() },
      { id: "s3", ministry_id: "min-1", secao: "Revisão Pastoral", secao_normalizada: "revisao pastoral", total_tarefas: 2, vista_em: new Date().toISOString() },
    ];
    case "asana_status_map": return [
      { id: "r1", ministry_id: null, secao_normalizada: "em arte", status: "em_producao", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "r2", ministry_id: null, secao_normalizada: "com o ministerio", status: "aguardando_ministerio", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    case "data_sources": return [{ id: "ds-1", ministry_id: "min-1", tipo: "asana", nome: "Quadro da Comunicação", ativo: true }];
    case "site_theme": return [{ id: 1, brand_color: null, walnut_color: null }];
    case "metrics": return [];
    case "audit_log": return [];
    default: return SEM_FIXTURE;
  }
}

function casa(linha: Linha, f: Filtro): boolean {
  // Filtro sobre coluna de tabela embutida ("demands.ministry_id") — o
  // mock trata como filtro no objeto aninhado.
  if (f.coluna.includes(".")) {
    const [rel, col] = f.coluna.split(".");
    const alvo = linha[rel] as Linha | null;
    return alvo != null && String(alvo[col]) === String(f.valor);
  }
  const v = linha[f.coluna];
  switch (f.op) {
    case "eq": return String(v) === String(f.valor);
    case "neq": return String(v) !== String(f.valor);
    case "is": return f.valor === null ? v == null : v === f.valor;
    case "not.is": return f.valor === null ? v != null : v !== f.valor;
    case "in": return (f.valor as unknown[]).map(String).includes(String(v));
    case "gte": return v != null && String(v) >= String(f.valor);
    case "lte": return v != null && String(v) <= String(f.valor);
    default: return true;
  }
}

class Consulta implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private filtros: Filtro[] = [];
  private ordenacoes: { coluna: string; asc: boolean }[] = [];
  private limite: number | null = null;
  private umaLinha: "maybe" | "single" | null = null;
  private orEspec: string | null = null;

  constructor(private readonly nome: string) {}

  select() { return this; }
  eq(coluna: string, valor: unknown) { this.filtros.push({ op: "eq", coluna, valor }); return this; }
  neq(coluna: string, valor: unknown) { this.filtros.push({ op: "neq", coluna, valor }); return this; }
  is(coluna: string, valor: unknown) { this.filtros.push({ op: "is", coluna, valor }); return this; }
  in(coluna: string, valor: unknown[]) { this.filtros.push({ op: "in", coluna, valor }); return this; }
  gte(coluna: string, valor: unknown) { this.filtros.push({ op: "gte", coluna, valor }); return this; }
  lte(coluna: string, valor: unknown) { this.filtros.push({ op: "lte", coluna, valor }); return this; }
  not(coluna: string, op: string, valor: unknown) { this.filtros.push({ op: `not.${op}`, coluna, valor }); return this; }
  or(espec: string) { this.orEspec = espec; return this; }
  order(coluna: string, opts?: { ascending?: boolean }) {
    this.ordenacoes.push({ coluna, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) { this.limite = n; return this; }
  maybeSingle() { this.umaLinha = "maybe"; return this; }
  single() { this.umaLinha = "single"; return this; }
  // Escritas não fazem nada: o QA é de leitura e layout.
  insert() { return this; }
  update() { return this; }
  delete() { return this; }
  upsert() { return this; }

  private resolver() {
    const base = tabela(this.nome);
    if (base === SEM_FIXTURE) {
      return { data: null, error: { message: `QA_MOCK: tabela "${this.nome}" sem fixture` } };
    }

    let linhas = base.filter((l) => this.filtros.every((f) => casa(l, f)));

    // `.or("a.gte.X,a.is.null")` — a única forma de OR usada no projeto.
    if (this.orEspec) {
      const termos = this.orEspec.split(",").map((t) => {
        const [coluna, op, ...resto] = t.split(".");
        const bruto = resto.join(".");
        return { op, coluna, valor: bruto === "null" ? null : bruto } as Filtro;
      });
      linhas = linhas.filter((l) => termos.some((t) => casa(l, t)));
    }

    for (const o of [...this.ordenacoes].reverse()) {
      linhas = [...linhas].sort((a, b) => {
        const va = a[o.coluna], vb = b[o.coluna];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;   // nulls por último, como nullsFirst:false
        if (vb == null) return -1;
        const cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
        return o.asc ? cmp : -cmp;
      });
    }

    if (this.limite != null) linhas = linhas.slice(0, this.limite);
    if (this.umaLinha) return { data: linhas[0] ?? null, error: null };
    return { data: linhas, error: null };
  }

  then<R1 = { data: unknown; error: { message: string } | null }, R2 = never>(
    onFulfilled?: ((v: { data: unknown; error: { message: string } | null }) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((r: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.resolver()).then(onFulfilled, onRejected);
  }
}

export async function createClient() {
  return {
    from(nome: string) { return new Consulta(nome); },
    auth: {
      async getUser() {
        return { data: { user: { id: "user-1", email: "qa@atitude.local" } }, error: null };
      },
      admin: {
        // A tela de usuários pagina a API de Auth. Devolver sempre a mesma
        // página faria a leitura entrar em laço; a segunda página vem
        // vazia, que é o sinal de fim.
        async listUsers({ page = 1 }: { page?: number; perPage?: number } = {}) {
          if (page > 1) return { data: { users: [] }, error: null };
          return {
            data: {
              users: [
                { id: "user-1", email: "ana@atitude.com.br" },
                { id: "user-2", email: "joao.pereira@ibatitude.com.br" },
                { id: "user-3", email: "maria@ibatitude.com.br" },
              ],
            },
            error: null,
          };
        },
        async deleteUser() { return { data: null, error: null }; },
        async createUser() { return { data: { user: null }, error: { message: "QA_MOCK: criação desativada" } }; },
      },
    },
    storage: {
      from() {
        return {
          async upload() { return { data: null, error: { message: "QA_MOCK: upload desativado" } }; },
          getPublicUrl() { return { data: { publicUrl: "" } }; },
        };
      },
    },
  };
}
