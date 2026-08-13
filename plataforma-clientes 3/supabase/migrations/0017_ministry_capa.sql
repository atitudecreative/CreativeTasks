-- =========================================================
-- Capa (imagem de fundo) por ministério: cada ministério pode
-- ter a própria imagem, usada como fundo do menu lateral
-- (aside) quando ele é o ministério ativo na sessão. Só a
-- Comunicação sobe/troca (feito na tela de edição do ministério
-- em /dashboard/admin/ministerios/[id]) — troca a "cara" de um
-- ministério pra todo mundo vinculado a ele, então não é
-- autoatendimento como a cor pessoal (migration 0015).
--
-- Reaproveita o bucket "branding" — se a migration 0016 (logo do
-- site, removida da interface mas não desfeita) já rodou, o
-- bucket e as policies já existem; os comandos abaixo são
-- escritos pra funcionar também se 0016 nunca rodou nesse banco.
-- =========================================================
alter table ministries
  add column if not exists capa_url text;

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "branding: leitura pública" on storage.objects;
create policy "branding: leitura pública"
  on storage.objects for select
  using (bucket_id = 'branding');

drop policy if exists "branding: Comunicação envia" on storage.objects;
create policy "branding: Comunicação envia"
  on storage.objects for insert
  with check (bucket_id = 'branding' and public.is_comunicacao_global());

drop policy if exists "branding: Comunicação atualiza" on storage.objects;
create policy "branding: Comunicação atualiza"
  on storage.objects for update
  using (bucket_id = 'branding' and public.is_comunicacao_global());

drop policy if exists "branding: Comunicação apaga" on storage.objects;
create policy "branding: Comunicação apaga"
  on storage.objects for delete
  using (bucket_id = 'branding' and public.is_comunicacao_global());
