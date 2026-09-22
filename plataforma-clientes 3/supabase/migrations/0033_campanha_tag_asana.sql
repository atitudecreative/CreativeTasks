-- =========================================================================
-- 0033 — A campanha passa a guardar o ID da tag do Asana
-- =========================================================================
-- Aditiva: acrescenta uma coluna e um índice. Não apaga nada, não muda
-- nenhuma linha existente, não mexe em policy.
--
-- O PROBLEMA QUE ISTO RESOLVE
-- O sync casava tag do Asana com campanha do portal pelo NOME:
--
--   const key = tagName.trim().toLowerCase();
--
-- Nome é o único dado da tag que muda. No dia em que alguém renomeia
-- "Funday" para "Funday 2026" no Asana, a chave deixa de bater, o sync
-- conclui que é uma tag nova e cria uma SEGUNDA campanha. A antiga fica
-- para trás com todas as demandas anteriores; a nova nasce vazia,
-- pendente de publicação, e o portal passa a mostrar duas coisas com
-- quase o mesmo nome — nenhuma delas completa.
--
-- O gid da tag não muda nunca. É por ele que a correspondência tem que
-- ser feita; o nome vira apenas o rótulo exibido, e renomear no Asana
-- passa a renomear a campanha em vez de duplicá-la.
--
-- A migration 0018 já teve de limpar duplicatas criadas por esse mesmo
-- tipo de casamento por nome (lá, por ministério). Isto é a causa raiz do
-- outro lado do problema.
--
-- ADOÇÃO DAS CAMPANHAS QUE JÁ EXISTEM
-- A coluna nasce nula em todo mundo. O sync adota o gid na primeira
-- rodada: quando encontra uma tag cujo gid ainda não está em lugar nenhum
-- mas cujo NOME bate com uma campanha existente, grava o gid nela em vez
-- de criar outra. Ou seja, a transição acontece sozinha, sem UPDATE de
-- backfill às cegas aqui — que seria um chute, já que só o Asana sabe
-- qual gid corresponde a qual nome.
-- =========================================================================

alter table campaigns add column if not exists asana_tag_gid text;

comment on column campaigns.asana_tag_gid is
  'gid da tag do Asana que originou esta campanha. Identificador estável: o nome da tag pode mudar, este não.';

-- Índice único PARCIAL (só onde não é nulo): campanha criada à mão no
-- portal não tem tag do Asana, e um unique comum trataria vários nulos
-- como duplicata em alguns bancos. Também é o que impede a mesma tag de
-- gerar duas campanhas se duas rodadas do sync correrem juntas.
create unique index if not exists campaigns_asana_tag_gid_uidx
  on campaigns (asana_tag_gid)
  where asana_tag_gid is not null;
