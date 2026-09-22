# QA visual — a plataforma rodando sem banco

Este diretório existe por um motivo prático: para revisar a interface é
preciso vê-la, e ver a interface exige dados. Um ambiente de
desenvolvimento nem sempre tem um Supabase alcançável — e quando tem, o
banco real não contém de propósito os casos que mais quebram layout
(ministério sem nenhuma demanda, valor de R$ 1.284.930, título de 140
caracteres, campanha sem mídia vinculada).

## Como funciona

`QA_MOCK=1` faz o `next.config.mjs` trocar **três módulos**, todos de
transporte:

| módulo real | vira |
| --- | --- |
| `@/lib/supabase/server` | `supabase-mock.ts` (consulta encadeável sobre os fixtures) |
| `@/lib/supabase/admin` | `supabase-mock.ts` (service role — a tela de usuários lê por ele) |
| `@/lib/supabase/middleware` | `middleware-mock.ts` (só deixa passar) |

A troca é feita com `NormalModuleReplacementPlugin`, e não com
`resolve.alias`: o Next resolve `@/...` com um plugin de resolução próprio
que corre antes dos apelidos, então o alias era ignorado — em silêncio.

Só o transporte é substituído. Todo o resto — as funções de leitura, os
cálculos, os componentes, os gráficos, o RSC — é o código de produção
rodando de verdade. Não existe uma "versão de QA" da interface que possa
divergir da real.

Sem a variável, nenhuma troca é registrada e o build de produção não toca
em nada daqui.

## Rodar

```bash
QA_MOCK=1 npm run build && QA_MOCK=1 npm start   # ou: QA_MOCK=1 npm run dev
node scripts/qa/varredura.mjs                    # varre as telas e reporta
node scripts/qa/print.mjs /dashboard saida.png   # um print só, pra olhar
```

A varredura abre cada tela em quatro larguras (390, 768, 1024, 1440),
tira print e reprova quando encontra:

- erro no console do navegador,
- rolagem horizontal (`scrollWidth > innerWidth`),
- elemento transbordando o viewport,
- texto sobreposto a outro elemento interativo.
