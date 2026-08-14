-- =========================================================
-- Demandas filhas (subtarefas do Asana): até aqui o sync só buscava
-- as tarefas de primeiro nível de cada projeto do Asana
-- (`/projects/{gid}/tasks` não devolve subtarefas por padrão) — então
-- qualquer subtarefa criada dentro de um card no Asana simplesmente
-- não aparecia no portal.
--
-- A partir daqui, `demands` ganha uma referência opcional pra sua
-- demanda "pai": o sync (scripts/sync-asana.mjs) passa a buscar as
-- subtarefas de cada tarefa e gravar cada uma como uma demanda normal,
-- só que com `parent_demand_id` preenchido. A aba Demandas continua
-- mostrando só as demandas de topo (parent_demand_id nulo); ao abrir o
-- card de uma delas, a página de detalhe lista as filhas com o status
-- de cada uma.
-- =========================================================

alter table demands
  add column if not exists parent_demand_id uuid references demands (id) on delete set null;

create index if not exists demands_parent_idx on demands (parent_demand_id);
