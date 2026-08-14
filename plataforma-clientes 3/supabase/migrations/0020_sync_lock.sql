-- =========================================================
-- Trava simples pra impedir que duas rodadas do sync do Asana corram ao
-- mesmo tempo. Na prática isso já aconteceu e causou timeout em cascata:
-- duas execuções tentando criar a MESMA demanda ao mesmo tempo disputam o
-- mesmo bloqueio de linha — uma trava esperando a outra terminar, e como
-- o sync ficou bem mais lento depois que passou a descer pelas
-- subtarefas (uma tarefa "guarda-chuva" chegou a ter 1500+ filhas), esse
-- tempo de espera aumentou muito, e uma segunda rodada disparada antes da
-- primeira terminar (manualmente, ou pelo agendamento do cron ser mais
-- frequente do que uma rodada completa demora) faz o banco inteiro
-- engasgar.
--
-- Não dá pra usar advisory lock do Postgres (pg_advisory_lock): ele só
-- vale enquanto a MESMA conexão do banco ficar aberta, e o script fala
-- com o banco via API REST do Supabase — cada chamada pode cair numa
-- conexão diferente do pool. Por isso aqui é uma trava "manual" numa
-- tabela: uma linha só, destravada com um UPDATE atômico que só funciona
-- se ninguém mais estiver com o cadeado (ou se travou há mais de 1h —
-- sinal de que um processo anterior morreu sem liberar).
-- =========================================================
create table if not exists sync_lock (
  id text primary key,
  locked boolean not null default false,
  locked_at timestamptz
);

insert into sync_lock (id, locked)
values ('asana', false)
on conflict (id) do nothing;

-- Só o script de sync mexe aqui, usando a service role (que ignora RLS de
-- qualquer forma) — habilita RLS sem nenhuma policy só pra garantir que
-- ninguém mais (ex: usuário comum pela API) consiga ler ou mudar isso.
alter table sync_lock enable row level security;
