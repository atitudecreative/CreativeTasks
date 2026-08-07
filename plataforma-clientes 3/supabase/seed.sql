-- Dados de exemplo pra ver o portal funcionando. Rode depois de já
-- ter pelo menos 1 usuário criado via Authentication > Users no
-- Supabase, e depois de rodar todas as migrations (0001 a 0004).

insert into ministries (id, name, slug, sigla, categoria, status)
values ('00000000-0000-0000-0000-000000000001', 'Ministério de Exemplo', 'ministerio-exemplo', 'ME', 'ministerio', 'ativo')
on conflict (id) do nothing;

-- Descomente e ajuste o user_id (de Authentication > Users) pra
-- dar acesso de leitor a esse usuário nesse ministério:
-- insert into ministry_members (ministry_id, user_id, role)
-- values ('00000000-0000-0000-0000-000000000001', ':user_id', 'leitor');

-- Pra dar acesso de Comunicação (vê todos os ministérios, sem precisar
-- de vínculo por ministério), defina o papel global do usuário:
-- update profiles set papel_global = 'gestor_comunicacao' where id = ':user_id';

-- Vínculo com um projeto do Asana (gid do projeto, visível na URL do
-- projeto no Asana). Descomente e ajuste depois de decidir qual
-- projeto pertence a este ministério — depois disso, rode
-- `npm run sync:asana` pra popular a tabela `demands`.
-- insert into data_sources (ministry_id, source, external_id)
-- values ('00000000-0000-0000-0000-000000000001', 'asana', '1212386890591811');

-- Exemplo de campanha e demanda cadastradas manualmente (PRD 14.2:
-- no MVP o cadastro é manual ou por planilha).
insert into campaigns (ministry_id, nome, tipo, fase, saude, orcamento_planejado)
values (
  '00000000-0000-0000-0000-000000000001',
  'Campanha de exemplo',
  'campanha',
  'planejamento',
  'no_caminho',
  5000
);

insert into demands (ministry_id, titulo, tipo_servico, status, prioridade, prazo_acordado, observacao_publicada)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demanda de exemplo',
  'design',
  'em_producao',
  'media',
  current_date + interval '7 days',
  'Peça de divulgação em produção.'
);
