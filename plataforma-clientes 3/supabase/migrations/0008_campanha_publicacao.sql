-- Campanhas/eventos detectados automaticamente por tag do Asana não devem
-- aparecer pro ministério até a Comunicação revisar e "abrir" o evento de
-- propósito. `publicada` controla isso: o ministério só enxerga campanhas
-- com publicada = true.
--
-- Campanhas que já existem (criadas manualmente antes desta migration)
-- continuam visíveis — por isso o default é `true`. O sync do Asana passa a
-- gravar `publicada = false` explicitamente só pra campanha nova criada a
-- partir de uma tag.

alter table campaigns
  add column if not exists origem text not null default 'manual'
    check (origem in ('manual', 'asana_tag')),
  add column if not exists publicada boolean not null default true;

create index if not exists campaigns_publicada_idx on campaigns (ministry_id, publicada);
