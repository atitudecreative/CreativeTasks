-- =========================================================
-- Aparência por ministério: em vez de cada usuário escolher a própria
-- cor (migration 0015, aba "Aparência" pessoal — removida), agora é a
-- Comunicação quem define a cor de cada ministério, na tela de edição
-- em /dashboard/admin/ministerios/[id]. O tema efetivo de uma sessão
-- passa a ser: cor do ministério ativo, com fallback pra cor padrão do
-- site (site_theme) quando o ministério não tiver cor própria definida.
--
-- As colunas profiles.brand_color/walnut_color (migration 0015) ficam
-- no banco sem uso — não apagamos dado por precaução, só paramos de
-- ler/escrever nelas no código.
-- =========================================================
alter table ministries
  add column if not exists brand_color text,
  add column if not exists walnut_color text;
