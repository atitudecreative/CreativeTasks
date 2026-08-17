-- =========================================================
-- Entregas e arquivos: fecha o ciclo de aprovação. Até aqui, o status
-- `para_aprovacao` existia na tabela mas ninguém do lado do ministério
-- conseguia mexer nele — só a Comunicação (via `can_edit_ministry`)
-- conseguia editar qualquer coisa em `deliverables`. Isso dá pro papel
-- "aprovador" (já existe em ministry_members.role, só não tinha uso
-- nenhum ainda) aprovar ou pedir ajuste numa entrega, direto no portal.
--
-- Continua sem exigir Supabase Storage: entrega é sempre um link
-- (Drive, YouTube, etc.), nunca um arquivo hospedado aqui.
-- =========================================================
create or replace function public.is_ministry_approver(target_ministry_id uuid)
returns boolean as $$
  select exists (
    select 1 from ministry_members mm
    where mm.ministry_id = target_ministry_id
      and mm.user_id = auth.uid()
      and mm.role = 'aprovador'
  ) or public.can_edit_ministry(target_ministry_id);
$$ language sql stable security definer;

-- Policy adicional (permissiva, some com as já existentes em vez de
-- substituir): dá UPDATE pro aprovador do ministério, além do que a
-- Comunicação já tinha via "deliverables: Comunicação edita". A tela só
-- deixa mudar o status pela UI, mas a policy em si permite UPDATE geral
-- na linha (mesmo padrão de granularidade já usado nas outras tabelas
-- desse projeto).
drop policy if exists "deliverables: aprovador decide" on deliverables;
create policy "deliverables: aprovador decide" on deliverables
  for update using (public.is_ministry_approver(ministry_id))
  with check (public.is_ministry_approver(ministry_id));
