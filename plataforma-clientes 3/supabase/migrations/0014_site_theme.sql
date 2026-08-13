-- =========================================================
-- Tema do site: cor principal (laranja/"brand") e cor
-- secundária (marrom/"walnut") viram configuráveis pela
-- Comunicação em vez de fixas no código. Uma linha só
-- (singleton) — não precisa de FK pra nada.
--
-- Leitura é pública (até a tela de login precisa saber a cor
-- antes do usuário logar); só Comunicação pode alterar.
-- =========================================================
create table if not exists site_theme (
  id boolean primary key default true,
  brand_color text not null default '#f3701c',
  walnut_color text not null default '#87603f',
  updated_at timestamptz not null default now(),
  constraint site_theme_singleton check (id)
);

insert into site_theme (id, brand_color, walnut_color)
values (true, '#f3701c', '#87603f')
on conflict (id) do nothing;

alter table site_theme enable row level security;

create policy "site_theme: todo mundo lê" on site_theme
  for select using (true);

create policy "site_theme: Comunicação altera" on site_theme
  for update using (public.is_comunicacao_global())
  with check (public.is_comunicacao_global());
