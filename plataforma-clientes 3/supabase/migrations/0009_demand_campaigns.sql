-- Uma demanda pode estar em mais de uma campanha/evento ao mesmo tempo
-- (ex: uma tarefa do Asana com várias tags). `demands.campaign_id`
-- continua existindo (não é mais usada pelo sync do Asana, mas cadastro
-- manual antigo continua funcionando); a partir de agora os vínculos
-- vindos de tags do Asana ficam em `demand_campaigns`, uma linha por
-- combinação demanda + campanha.

create table if not exists demand_campaigns (
  demand_id uuid not null references demands (id) on delete cascade,
  campaign_id uuid not null references campaigns (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (demand_id, campaign_id)
);

create index if not exists demand_campaigns_campaign_idx on demand_campaigns (campaign_id);
create index if not exists demand_campaigns_demand_idx on demand_campaigns (demand_id);

alter table demand_campaigns enable row level security;

drop policy if exists "demand_campaigns: acesso por ministério" on demand_campaigns;
create policy "demand_campaigns: acesso por ministério" on demand_campaigns
  for select using (
    exists (
      select 1 from demands d
      where d.id = demand_campaigns.demand_id
        and public.has_ministry_access(d.ministry_id)
    )
  );

drop policy if exists "demand_campaigns: Comunicação edita" on demand_campaigns;
create policy "demand_campaigns: Comunicação edita" on demand_campaigns
  for all using (
    exists (
      select 1 from demands d
      where d.id = demand_campaigns.demand_id
        and public.can_edit_ministry(d.ministry_id)
    )
  )
  with check (
    exists (
      select 1 from demands d
      where d.id = demand_campaigns.demand_id
        and public.can_edit_ministry(d.ministry_id)
    )
  );
