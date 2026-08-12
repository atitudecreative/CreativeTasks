-- =========================================================
-- Pastas de campanha: agrupam campanhas/eventos dentro de um
-- ministério (ex: pasta "Festa da Roça" contendo "Festa da
-- Roça 2025", "Festa da Roça 2026" etc — edições anuais do
-- mesmo evento). Cada campanha pode estar em no máximo uma
-- pasta (ou nenhuma) e tem uma posição pra controlar a ordem
-- de exibição dentro da pasta (ou dentro de "sem pasta").
-- =========================================================
create table if not exists campaign_folders (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references ministries (id) on delete cascade,
  nome text not null,
  posicao integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists campaign_folders_ministry_idx on campaign_folders (ministry_id);

alter table campaigns
  add column if not exists folder_id uuid references campaign_folders (id) on delete set null,
  add column if not exists posicao integer not null default 0;

create index if not exists campaigns_folder_idx on campaigns (folder_id);

alter table campaign_folders enable row level security;

create policy "campaign_folders: acesso por vínculo ou Comunicação" on campaign_folders
  for select using (public.has_ministry_access(ministry_id));

create policy "campaign_folders: Comunicação gerencia" on campaign_folders
  for all using (public.can_edit_ministry(ministry_id))
  with check (public.can_edit_ministry(ministry_id));
