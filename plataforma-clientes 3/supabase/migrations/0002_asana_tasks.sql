-- =========================================================
-- Detalhe das tarefas do Asana por organização (cliente).
-- Alimentada pelo script scripts/sync-asana.mjs, que roda fora
-- do Next.js (cron/worker) usando a service role key.
-- A tabela `metrics` continua guardando só os agregados
-- (tasks_completed, tasks_open) usados nos cards da Visão Geral.
-- =========================================================

create table if not exists asana_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  asana_task_gid text not null,
  name text not null,
  completed boolean not null default false,
  assignee_name text,
  due_on date,
  permalink_url text,
  synced_at timestamptz not null default now(),
  unique (organization_id, asana_task_gid)
);

create index if not exists asana_tasks_org_idx
  on asana_tasks (organization_id, completed, due_on);

alter table asana_tasks enable row level security;

create policy "asana_tasks: membro ou admin da agência vê"
  on asana_tasks for select
  using (
    exists (
      select 1 from organization_members om
      where om.organization_id = asana_tasks.organization_id
        and om.user_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_agency_admin = true
    )
  );

-- Escrita (insert/update/delete) é feita só pela service role
-- (usada pelo script de sincronização), por isso não há policy
-- de insert/update aqui.
