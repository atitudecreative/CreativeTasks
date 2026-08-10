-- Corrige uma colisão possível entre as sequences de identificador
-- (demand_seq, campaign_seq) e valores de `identificador` que já existem
-- nas tabelas — por exemplo linhas criadas/editadas manualmente no Table
-- Editor com um identificador digitado à mão, ou uma sequence que ficou
-- "atrasada" em relação aos dados reais. Sem isso, o gatilho que gera
-- identificador novo (DEM-YYYY-NNNN / CAM-YYYY-NNNN) pode tentar reusar
-- um número que já existe, e o insert falha com
-- "duplicate key value violates unique constraint demands_identificador_key".
--
-- Seguro de rodar mais de uma vez.

select setval(
  'demand_seq',
  greatest(
    coalesce(
      (select max(split_part(identificador, '-', 3)::int) from demands where identificador like 'DEM-%'),
      0
    ),
    (select last_value from demand_seq)
  ),
  true
);

select setval(
  'campaign_seq',
  greatest(
    coalesce(
      (select max(split_part(identificador, '-', 3)::int) from campaigns where identificador like 'CAM-%'),
      0
    ),
    (select last_value from campaign_seq)
  ),
  true
);
