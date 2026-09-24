# Versões enxutas para colar no SQL Editor do Supabase

Os arquivos aqui são **o mesmo SQL** das migrations `0030`, `0031`, `0032` e `0033`
da pasta acima, só que sem os blocos de comentário que explicam as decisões.
São para colar no SQL Editor do Supabase quando o arquivo comentado chega
truncado — um script longo colado num editor web às vezes é cortado no meio,
e o Postgres recusa o arquivo inteiro com um erro de sintaxe que aponta para
um lugar onde não há nada de errado (`syntax error at or near ";"`,
`syntax error at end of input`).

Menos da metade do tamanho:

| arquivo | comentado | enxuto |
| --- | --- | --- |
| `0030_historico_status_e_indices.sql` | 6.585 bytes | 2.930 bytes |
| `0031_asana_de_para_status.sql` | 8.657 bytes | 4.009 bytes |
| `0032_perfil_campanha.sql` | 6.680 bytes | 4.015 bytes |
| `0033_campanha_tag_asana.sql` | 2.462 bytes | 385 bytes |

**A documentação continua valendo.** O raciocínio por trás de cada decisão
está nos arquivos da pasta acima, que são a fonte de verdade do repositório.
Estes aqui existem só para o transporte até o editor.

## Como rodar

Na ordem: `0030` → `0031` → `0032` → `0033`. Cada arquivo pode ser colado inteiro.

Se ainda assim vier truncado, cada arquivo está dividido em partes marcadas
com `-- ===== PARTE n de N =====`. Cole e execute uma parte de cada vez, na
ordem. As partes foram testadas rodando separadas e produzem exatamente o
mesmo resultado.

Uma exceção: a **PARTE 1 do 0030** é um corpo de função entre `$$` e precisa
ir inteira, do `create or replace function` até o `$$;` final.

## Dá para rodar duas vezes?

Dá. Os três são idempotentes: `create or replace`, `create table if not
exists`, `create index if not exists`, `drop trigger if exists` antes de
criar, e `on conflict do nothing` no seed do de-para. Rodar de novo não
sobrescreve regra que a Comunicação já tenha ajustado pela interface.

## Verificação

Os três foram aplicados num PostgreSQL 16 real, sobre as 29 migrations
anteriores, inteiros e parte por parte. O schema resultante é idêntico ao
das versões comentadas — mesma view, mesmas funções, mesmos triggers,
mesmos índices, mesmas policies e as mesmas 44 regras de de-para. A única
diferença que aparece no catálogo do Postgres são os comentários dentro do
corpo de `log_mudanca_status()`, que o banco guarda junto com o código.
