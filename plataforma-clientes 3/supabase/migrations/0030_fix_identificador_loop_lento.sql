-- =========================================================
-- A 0007 trocou o gatilho de identificador por um loop "tenta um valor,
-- confere se existe, se existir tenta o PRÓXIMO" — resolve a duplicidade,
-- mas se a sequence ficar muito atrasada em relação ao maior identificador
-- já usado (ex: alguém cadastra uma demanda no Table Editor com um
-- identificador digitado à mão, tipo DEM-2026-9000, enquanto a sequence
-- ainda está em 500), o loop tenta 501, 502, 503... um por um, até chegar
-- em 9001 — são milhares de tentativas, cada uma com uma consulta ao
-- banco, TODAS dentro do mesmo gatilho, disparado por linha inserida. Num
-- sync que insere uma leva de demandas novas de uma vez (ex: primeiro sync
-- de um projeto do Asana), isso multiplica pelo número de linhas e estoura
-- o "statement timeout" — foi exatamente esse o sintoma observado no cron
-- do sync do Asana (lote de 159 demandas dando timeout 3 tentativas
-- seguidas).
--
-- Esta migration troca "tenta o próximo, um por um" por "na primeira
-- colisão, pula direto pro maior número já usado nesse ano e tenta de
-- novo" — o loop passa a rodar no máximo 2 vezes por linha, não importa
-- o tamanho do atraso da sequence.
--
-- Seguro de rodar mais de uma vez.
-- =========================================================

create or replace function public.set_demand_identificador()
returns trigger as $$
declare
  year_prefix text := 'DEM-' || extract(year from now())::text || '-';
  candidate text;
  max_num int;
begin
  if new.identificador is null then
    loop
      candidate := year_prefix || lpad(nextval('demand_seq')::text, 4, '0');
      exit when not exists (select 1 from demands where identificador = candidate);

      -- Colidiu: em vez de tentar o próximo número (que também pode
      -- colidir, e o seguinte, etc.), pula a sequence direto pro maior
      -- número já usado nesse ano — a próxima volta do loop já sai com um
      -- candidato livre (ou, na pior das hipóteses, mais uma colisão só se
      -- outra sessão concorrente tiver acabado de usar esse mesmo número).
      select max(split_part(identificador, '-', 3)::int) into max_num
        from demands where identificador like year_prefix || '%';

      if max_num is not null then
        perform setval('demand_seq', greatest(max_num, (select last_value from demand_seq)));
      end if;
    end loop;
    new.identificador := candidate;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.set_campaign_identificador()
returns trigger as $$
declare
  year_prefix text := 'CAM-' || extract(year from now())::text || '-';
  candidate text;
  max_num int;
begin
  if new.identificador is null then
    loop
      candidate := year_prefix || lpad(nextval('campaign_seq')::text, 4, '0');
      exit when not exists (select 1 from campaigns where identificador = candidate);

      select max(split_part(identificador, '-', 3)::int) into max_num
        from campaigns where identificador like year_prefix || '%';

      if max_num is not null then
        perform setval('campaign_seq', greatest(max_num, (select last_value from campaign_seq)));
      end if;
    end loop;
    new.identificador := candidate;
  end if;
  return new;
end;
$$ language plpgsql;

-- Resincroniza as duas sequences agora (mesma lógica da 0006) — desempaca
-- o atraso atual que causou o timeout, além da correção estrutural acima
-- pra não voltar a acontecer.
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
