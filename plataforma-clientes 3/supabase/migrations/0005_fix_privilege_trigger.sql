-- Corrige um bug da 0004: o gatilho que impede autopromoção de
-- privilégio também bloqueava atualizações feitas direto pelo SQL
-- Editor / service role, porque nesses contextos auth.uid() vem nulo
-- e a função interpretava isso como "usuário comum tentando se
-- promover". Agora só aplica a trava quando existe mesmo uma sessão
-- de usuário autenticado tentando mudar o próprio papel.
create or replace function public.prevent_self_privilege_escalation()
returns trigger as $$
begin
  if auth.uid() is not null
     and new.papel_global is distinct from old.papel_global
     and not public.is_comunicacao_global() then
    new.papel_global := old.papel_global;
  end if;
  return new;
end;
$$ language plpgsql security definer;
