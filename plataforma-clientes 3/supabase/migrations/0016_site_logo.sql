-- =========================================================
-- Logo do site: dá pra Comunicação subir um PNG pra substituir
-- a logo fixa (/logo-dark-bg.png) usada no menu lateral e na
-- tela de login — sem precisar mexer em código/deploy. Fica em
-- site_theme (mesma linha singleton das cores, migration 0014)
-- porque, diferente das cores (que viraram pessoais na 0015), a
-- logo é uma identidade de marca única pra todo mundo que acessa
-- o portal.
-- =========================================================
alter table site_theme
  add column if not exists logo_url text;

-- Bucket público (a tela de login precisa mostrar a logo pra gente
-- que ainda nem logou).
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "branding: leitura pública"
  on storage.objects for select
  using (bucket_id = 'branding');

create policy "branding: Comunicação envia"
  on storage.objects for insert
  with check (bucket_id = 'branding' and public.is_comunicacao_global());

create policy "branding: Comunicação atualiza"
  on storage.objects for update
  using (bucket_id = 'branding' and public.is_comunicacao_global());

create policy "branding: Comunicação apaga"
  on storage.objects for delete
  using (bucket_id = 'branding' and public.is_comunicacao_global());
