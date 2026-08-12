-- =========================================================
-- Permite que a Comunicação exclua um ministério. A migration
-- 0004 criou policies de insert/update em "ministries" mas
-- nenhuma de delete — sem isso, o botão "Excluir" na tela de
-- cadastro falharia silenciosamente por causa do RLS.
--
-- Atenção: excluir um ministério apaga em cascata (on delete
-- cascade, definido em 0001/0004) todos os vínculos de membro,
-- fontes de dados (Asana), métricas, campanhas, demandas e
-- entregas daquele ministério. A UI avisa isso antes de excluir.
-- =========================================================
create policy "ministries: Comunicação exclui" on ministries
  for delete using (public.is_comunicacao_global());
