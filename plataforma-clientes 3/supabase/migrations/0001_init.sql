-- =========================================================
-- Schema base: multi-tenant (cada "organization" = 1 empresa cliente)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Perfis (1 linha por usuário do Supabase Auth)
-- is_agency_admin = true para a equipe interna da agência,
-- que enxerga todos os clientes. Clientes normais só enxergam
-- a(s) organization(s) em que são membros.
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  is_agency_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Empresas clientes
-- ---------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Vínculo usuário <-> empresa cliente (quem pode logar e ver o quê)
-- ---------------------------------------------------------
create table if not exists organization_members (
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- ---------------------------------------------------------
-- Configuração de cada integração por cliente
-- (credenciais ficam em outro lugar/cofre; aqui só o "de-para")
-- ---------------------------------------------------------
create table if not exists data_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  source text not null check (source in ('asana', 'meta_ads', 'e_inscricao')),
  external_id text, -- ex: gid do projeto Asana, id da ad account, slug do evento
  config jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, source, external_id)
);

-- ---------------------------------------------------------
-- Tabela genérica de métricas já sincronizadas.
-- O dashboard SEMPRE lê daqui — nunca das APIs externas direto.
-- Um job de sincronização (rodando fora do Next.js, ex: cron/worker)
-- é quem escreve nessa tabela periodicamente.
-- ---------------------------------------------------------
create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  source text not null check (source in ('asana', 'meta_ads', 'e_inscricao')),
  metric_key text not null,     -- ex: 'tasks_completed', 'ad_spend', 'registrations'
  metric_label text not null,   -- ex: 'Tarefas concluídas', 'Investimento em anúncios'
  value numeric not null,
  period_date date not null,    -- dia/mês de referência do dado
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists metrics_org_period_idx
  on metrics (organization_id, period_date desc);

-- =========================================================
-- Row Level Security: cada cliente só vê os próprios dados.
-- Admins da agência (is_agency_admin) veem tudo.
-- =========================================================

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table data_sources enable row level security;
alter table metrics enable row level security;
alter table profiles enable row level security;

-- profiles: cada usuário vê e edita só o próprio perfil
create policy "profiles: usuário vê o próprio perfil"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: usuário edita o próprio perfil"
  on profiles for update
  using (auth.uid() = id);

-- helper implícito: existe vínculo do usuário logado com a organization?
-- (repetido nas policies abaixo via subquery em organization_members)

create policy "organizations: membro ou admin da agência vê"
  on organizations for select
  using (
    exists (
      select 1 from organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_agency_admin = true
    )
  );

create policy "organization_members: membro ou admin da agência vê"
  on organization_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_agency_admin = true
    )
  );

create policy "data_sources: membro ou admin da agência vê"
  on data_sources for select
  using (
    exists (
      select 1 from organization_members om
      where om.organization_id = data_sources.organization_id
        and om.user_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_agency_admin = true
    )
  );

create policy "metrics: membro ou admin da agência vê"
  on metrics for select
  using (
    exists (
      select 1 from organization_members om
      where om.organization_id = metrics.organization_id
        and om.user_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_agency_admin = true
    )
  );

-- Escrita (insert/update/delete) em organizations, data_sources e metrics
-- fica só para a service role (usada pelos jobs de sincronização e pelo
-- painel administrativo da agência), por isso não criamos policies de
-- insert/update aqui — a service role ignora RLS por padrão no Supabase.

-- ---------------------------------------------------------
-- Trigger: cria uma linha em profiles automaticamente
-- quando um novo usuário se cadastra no Supabase Auth.
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
