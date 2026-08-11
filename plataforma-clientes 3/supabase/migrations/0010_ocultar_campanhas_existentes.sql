-- A 0008 deixava campanha antiga visível por padrão (publicada = true) e só
-- escondia campanha nova detectada por tag do Asana. Isso encheu a aba
-- Campanhas do ministério de eventos já passados. Agora TODA campanha
-- nasce oculta — a Comunicação decide quais valem a pena mostrar, em
-- /dashboard/admin/campanhas-pendentes (lista todas as ocultas, não só as
-- vindas de tag).
--
-- Seguro de rodar mais de uma vez.

alter table campaigns alter column publicada set default false;

update campaigns set publicada = false where publicada = true;
