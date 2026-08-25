-- =========================================================
-- Visibilidade manual de campanhas/eventos por ministério.
--
-- Até aqui, um ministério só via uma campanha se tivesse pelo menos
-- uma demanda vinculada a ela (migration 0018). A Comunicação pediu
-- controle manual: poder escolher, campanha por campanha, quais
-- ministérios (além dos que já têm demanda vinculada) também podem
-- vê-la — por exemplo, convidar um ministério pra ver o dashboard de
-- um evento antes de qualquer demanda dele existir.
--
-- Reaproveita a tabela `campaign_ministries`, criada na migration
-- 0004 ("ministérios participantes") mas nunca usada pelo código —
-- só tinha uma política de leitura. Ela já tem a PK certa
-- (campaign_id, ministry_id), então não precisa mudar o schema, só
-- passar a gravar nela e usá-la nas checagens de RLS.
--
-- Regra final: um ministério vê uma campanha se
--   (a) tiver demanda vinculada a ela (regra já existente), OU
--   (b) tiver uma linha em campaign_ministries pra ela (novo, manual).
-- A seleção manual SOMA à regra automática — nunca tira acesso de um
-- ministério que já tem demanda ali (decisão do Eduardo: menos risco
-- de alguém perder o contexto do próprio trabalho por engano).
-- =========================================================

-- ---------------------------------------------------------------
-- 1. Escrita em campaign_ministries: só Comunicação (mesma regra de
-- quem pode editar campanhas). A leitura já tinha uma política desde
-- a 0004 (has_ministry_access), que continua valendo.
-- ---------------------------------------------------------------
drop policy if exists "campaign_ministries: Comunicação gerencia" on campaign_ministries;
create policy "campaign_ministries: Comunicação gerencia" on campaign_ministries
  for all using (public.is_comunicacao_global())
  with check (public.is_comunicacao_global());

-- ---------------------------------------------------------------
-- 2. Função auxiliar (SECURITY DEFINER, mesmo padrão das outras
-- checagens cruzadas de RLS): a campanha foi liberada manualmente
-- pra algum ministério que o usuário logado acessa?
-- ---------------------------------------------------------------
create or replace function public.campaign_explicitly_shared_with_ministry(target_campaign_id uuid)
returns boolean as $$
  select exists (
    select 1
    from campaign_ministries cm
    where cm.campaign_id = target_campaign_id
      and public.has_ministry_access(cm.ministry_id)
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------
-- 3. campaigns: soma a liberação manual às regras de acesso já
-- existentes (origem ou demanda vinculada).
-- ---------------------------------------------------------------
drop policy if exists "campaigns: acesso por origem ou por demanda vinculada" on campaigns;
drop policy if exists "campaigns: acesso por origem, demanda vinculada ou liberação manual" on campaigns;
create policy "campaigns: acesso por origem, demanda vinculada ou liberação manual" on campaigns
  for select using (
    (ministry_id is not null and public.has_ministry_access(ministry_id))
    or public.campaign_has_accessible_demand(campaigns.id)
    or public.campaign_explicitly_shared_with_ministry(campaigns.id)
  );

-- ---------------------------------------------------------------
-- 4. campaign_shared_with_accessible_ministry (usada pra liberar
-- demandas/marcos de OUTROS ministérios dentro do dashboard da
-- campanha) passa a considerar também a liberação manual — assim um
-- ministério convidado manualmente vê o dashboard completo (demandas
-- de todo mundo envolvido), igual a quem já tinha demanda vinculada.
-- Continua exigindo `publicada = true`: o toggle de publicar/ocultar
-- continua sendo o interruptor geral.
-- ---------------------------------------------------------------
create or replace function public.campaign_shared_with_accessible_ministry(target_campaign_id uuid)
returns boolean as $$
  select exists (
    select 1
    from campaigns c
    where c.id = target_campaign_id
      and c.publicada = true
      and (
        exists (
          select 1
          from demand_campaigns dc
          join demands d on d.id = dc.demand_id
          where dc.campaign_id = target_campaign_id
            and public.has_ministry_access(d.ministry_id)
        )
        or public.campaign_explicitly_shared_with_ministry(target_campaign_id)
      )
  );
$$ language sql stable security definer;
