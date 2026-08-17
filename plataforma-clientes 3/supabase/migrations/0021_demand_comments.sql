-- =========================================================
-- Comentários em demandas: hoje a conversa sobre uma demanda acontece
-- fora do portal (WhatsApp, e-mail) e não fica registrada em lugar
-- nenhum. Isso dá um fio de comentário simples por demanda, visível pra
-- qualquer um que já enxerga a demanda (mesma regra de acesso: próprio
-- ministério, ou visível via campanha compartilhada).
-- =========================================================
create table if not exists demand_comments (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  corpo text not null,
  created_at timestamptz not null default now()
);

create index if not exists demand_comments_demand_idx on demand_comments (demand_id, created_at);

alter table demand_comments enable row level security;

-- Leitura e escrita: quem já enxerga a demanda (via has_ministry_access
-- direto, ou via demand_visible_via_shared_campaign quando a demanda é
-- de outro ministério mas compartilha uma campanha publicada — mesmas
-- duas funções SECURITY DEFINER criadas na migration 0018, reaproveitadas
-- aqui pra não duplicar a lógica de visibilidade cruzada).
drop policy if exists "demand_comments: acesso por visibilidade da demanda" on demand_comments;
create policy "demand_comments: acesso por visibilidade da demanda" on demand_comments
  for select using (
    exists (
      select 1 from demands d
      where d.id = demand_comments.demand_id
        and (
          public.has_ministry_access(d.ministry_id)
          or public.demand_visible_via_shared_campaign(d.id)
        )
    )
  );

drop policy if exists "demand_comments: criar se enxerga a demanda" on demand_comments;
create policy "demand_comments: criar se enxerga a demanda" on demand_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from demands d
      where d.id = demand_comments.demand_id
        and (
          public.has_ministry_access(d.ministry_id)
          or public.demand_visible_via_shared_campaign(d.id)
        )
    )
  );

-- Apagar: só o autor do comentário, ou Comunicação (moderação).
drop policy if exists "demand_comments: apagar próprio ou Comunicação" on demand_comments;
create policy "demand_comments: apagar próprio ou Comunicação" on demand_comments
  for delete using (
    author_id = auth.uid() or public.is_comunicacao_global()
  );
