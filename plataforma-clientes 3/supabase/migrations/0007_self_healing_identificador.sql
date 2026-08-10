-- A 0006 tentou resincronizar demand_seq/campaign_seq com o maior
-- identificador já existente, mas isso depende de comparar os números
-- corretamente — e mesmo corrigido, qualquer coisa que desalinhe de novo
-- a sequence dos dados reais (edição manual no Table Editor, uma migration
-- rodada fora de ordem, etc.) volta a causar
-- "duplicate key value violates unique constraint demands_identificador_key".
--
-- Esta migration troca a estratégia: em vez de confiar que a sequence
-- nunca vai colidir, o gatilho agora tenta um valor, confere se já existe
-- e — se existir — tenta o próximo, até achar um livre. Não importa mais
-- se a sequence está "atrasada": o gatilho sempre encontra um identificador
-- válido.
--
-- Seguro de rodar mais de uma vez.

create or replace function public.set_demand_identificador()
returns trigger as $$
declare
  candidate text;
begin
  if new.identificador is null then
    loop
      candidate := 'DEM-' || extract(year from now())::text || '-' ||
        lpad(nextval('demand_seq')::text, 4, '0');
      exit when not exists (select 1 from demands where identificador = candidate);
    end loop;
    new.identificador := candidate;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.set_campaign_identificador()
returns trigger as $$
declare
  candidate text;
begin
  if new.identificador is null then
    loop
      candidate := 'CAM-' || extract(year from now())::text || '-' ||
        lpad(nextval('campaign_seq')::text, 4, '0');
      exit when not exists (select 1 from campaigns where identificador = candidate);
    end loop;
    new.identificador := candidate;
  end if;
  return new;
end;
$$ language plpgsql;
