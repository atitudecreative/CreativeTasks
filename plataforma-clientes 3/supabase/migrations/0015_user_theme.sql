-- =========================================================
-- Aparência vira preferência PESSOAL: cada usuário pode ter a
-- sua própria cor principal/secundária, em vez de só existir a
-- cor única do site (site_theme, migration 0014). Quando o
-- usuário não escolheu nada (colunas nulas), continua valendo
-- a cor padrão do site.
--
-- Não precisa de policy nova de UPDATE: a policy "profiles:
-- usuário edita o próprio perfil" (migration 0001) já cobre
-- essas colunas, e o trigger de anti-escalação de privilégio
-- (migration 0004/0005) só olha pra papel_global — não mexe
-- aqui.
-- =========================================================
alter table profiles
  add column if not exists brand_color text,
  add column if not exists walnut_color text;

alter table profiles
  add constraint profiles_brand_color_format
    check (brand_color is null or brand_color ~* '^#[0-9a-f]{6}$');

alter table profiles
  add constraint profiles_walnut_color_format
    check (walnut_color is null or walnut_color ~* '^#[0-9a-f]{6}$');
