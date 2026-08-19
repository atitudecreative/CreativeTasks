-- =========================================================
-- Capa (arte de capa) por campanha: cada campanha pode ter uma
-- imagem própria, mostrada como banner no topo da tela de
-- detalhe da campanha (/dashboard/campanhas/[id]). Reaproveita o
-- mesmo bucket "branding" já usado pra logo do site e capa de
-- ministério (migrations 0016/0017) — as policies de leitura
-- pública e escrita restrita à Comunicação já existem e valem
-- pra qualquer objeto desse bucket, então não precisa recriar
-- nada aqui além da coluna.
-- =========================================================
alter table campaigns
  add column if not exists capa_url text;
