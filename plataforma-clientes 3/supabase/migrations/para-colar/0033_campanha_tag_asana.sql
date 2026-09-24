-- ===== PARTE 1 de 1 =====
alter table campaigns add column if not exists asana_tag_gid text;

comment on column campaigns.asana_tag_gid is
  'gid da tag do Asana que originou esta campanha. Identificador estável: o nome da tag pode mudar, este não.';

create unique index if not exists campaigns_asana_tag_gid_uidx
  on campaigns (asana_tag_gid)
  where asana_tag_gid is not null;
