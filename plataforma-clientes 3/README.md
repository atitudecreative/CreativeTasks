# Portal dos Ministérios

Fase 1 do PRD (Fundação do MVP): login, isolamento por ministério, cadastro
de ministérios, demandas, campanhas e marcos, entregas, painel
administrativo básico e auditoria essencial.

Esse nome e essa estrutura substituem a versão anterior ("Painel do
Cliente", genérica, baseada em "empresas clientes"). O vocabulário agora
segue o PRD: **ministério** no lugar de empresa/organização, **demanda** no
lugar de tarefa solta, **campanha** para iniciativas com várias demandas.

## Se você já rodou as migrations 0001-0003 em produção

A migration `0004_portal_ministerios_fase1.sql` é **aditiva**: ela renomeia
`organizations` → `ministries` e `organization_members` → `ministry_members`
(o Postgres preserva todos os dados no rename, nada é apagado) e cria as
tabelas novas por cima. É seguro rodar em cima do que você já tem.

Rode as migrations em ordem no SQL Editor do Supabase: `0001_init.sql` →
`0002_asana_tasks.sql` → `0003_metrics_unique.sql` → `0004_portal_ministerios_fase1.sql`
→ `0005_fix_privilege_trigger.sql` → `0006_fix_identificador_sequences.sql` →
`0007_self_healing_identificador.sql` → `0008_campanha_publicacao.sql` →
`0009_demand_campaigns.sql` → `0010_ocultar_campanhas_existentes.sql` →
`0011_ministerios_excluir.sql` → `0012_campaign_folders.sql`. Pule
as que já rodaram antes — a 0004 funciona mesmo que a 0002/0003 nunca tenham
rodado nesse banco (ela checa se as tabelas existem antes de mexer nelas). A
0005 corrige um bug da 0004 (o gatilho de segurança bloqueava até
atualização feita pelo próprio SQL Editor) — sempre rode ela depois da 0004.
A 0006 e a 0007 corrigem juntas uma colisão nas sequences de identificador
(`demand_seq`/`campaign_seq`): a 0007 é a que resolve de vez (o gatilho
passa a testar se o identificador já existe e tentar o próximo até achar um
livre, então não importa mais se a sequence ficou dessincronizada) — sempre
rode as duas, mesmo que nunca tenha visto esse erro (é seguro rodar de
novo). A 0010 esconde retroativamente toda campanha que já existia (antes
só campanha nova vinda de tag do Asana nascia oculta) — sempre rode depois
da 0008/0009. A 0011 permite excluir ministério (faltava a policy de RLS de
delete). A 0012 cria `campaign_folders` (pastas de campanha dentro de cada
ministério, ex: uma pasta "Festa da Roça" com uma campanha por edição/ano).

## Camada de inteligência (migration 0032)

A plataforma passa a **interpretar** os próprios dados, não só exibi-los.
"R$ 95 de custo por resultado" vira "R$ 95 — 20% acima da mediana de
eventos do mesmo tipo, sendo R$ 72 a R$ 88 a faixa usual".

### Onde o cálculo mora

`campanha_perfil` (view, migration 0032) devolve **uma linha por campanha**
com mídia, demandas, entregas e marcos já agregados. Antes, comparar
campanhas exigiria carregar tudo e somar num `.reduce()` no Node.

A view usa `security_invoker = true`, então roda com as permissões de quem
consulta. Isso não é detalhe: **sem esse ajuste, uma view sobre tabelas com
RLS vaza dado de todos os ministérios para qualquer usuário logado.** O
efeito colateral é desejável — um ministério compara contra o próprio
histórico, a Comunicação contra a carteira inteira, e isso sai de graça.

### O motor de regras

`src/lib/insights.ts` é puro: sem Supabase, sem `next/headers`, sem data
"de agora". Tudo entra por parâmetro, e é isso que permite testar cada
regra isoladamente.

**Três regras de honestidade, acima de qualquer outra coisa:**

1. **Não inventar.** Nenhuma regra dispara sem os dados que exige. Faltou
   base, não sai insight — e a tela diz *"dados insuficientes"* em vez de
   mostrar uma conclusão sem lastro.
2. **Mediana e quartil, nunca média.** Uma campanha com verba
   desproporcional destrói uma média e faz todo o resto parecer ruim. A
   faixa p25–p75 é o que responde de verdade "quanto costuma ser".
3. **Todo insight carrega o n.** "12% acima da média" sem dizer média de
   quantos é retórica. Cada insight leva `baseAmostra`, e a interface
   mostra.

Amostra mínima para uma faixa: **4 campanhas comparáveis** (mesmo `tipo`,
excluindo a analisada). Abaixo disso o quartil é ruído.

### Regras implementadas

| Regra | Dispara quando | Exige |
|---|---|---|
| Quartil (CPA, CTR, CPM, alcance) | valor sai da faixa p25–p75 e difere ≥10% da mediana | 4+ comparáveis |
| Anomalia investimento × retorno | verba subiu ≥20% e retorno não acompanhou nem 1/3 disso | campanha anterior do ministério, com verba e conversão |
| Eficiência | verba caiu ≥10% e retorno se manteve | idem |
| Orçamento | realizado >105% do aprovado, ou <70% com a campanha encerrada | orçamento aprovado |
| Tendência | resultados **estritamente** crescentes em 3+ eventos | histórico do ministério |
| Recorde | supera a melhor marca anterior do ministério | 2+ eventos anteriores |
| Pontualidade | taxa de entrega no prazo fora da faixa usual | 5+ demandas com prazo aferível |

Uma série que oscila **não** é chamada de tendência — isso seria vender
ruído como padrão.

### Testes

```bash
npm test          # 40 testes
npm run test:insights
```

27 testes só do motor, e boa parte deles verifica que a regra **não**
dispara: sem amostra, sem rastreamento de conversão, com série oscilante,
com valor dentro da faixa normal. Rodam com o runner nativo do Node
(`node --test`), sem dependência nova.

### Onde aparece

Seção **"Leitura automática"** do relatório de evento, logo depois do
resumo e antes dos números — quem abre o relatório quer saber "como foi"
antes de "quanto deu". Ao lado, o painel **"Contra eventos semelhantes"**
mostra em régua onde este evento cai na faixa usual de cada métrica.

### Visão de carteira e do cliente

`src/lib/carteira.ts` (puro, testado) agrega o perfil de campanha em duas
leituras que o relatório individual não dá:

- **Painel da Comunicação** (`/dashboard/admin`) — investido e resultados
  dos últimos 12 meses contra os 12 anteriores, e ranking de eficiência
  por ministério (custo por resultado **mediano**, não médio).
- **Início do ministério** (`/dashboard`) — evolução dos eventos
  publicados, melhor marca, e a eficiência do ministério contra a faixa
  dos demais.

Duas decisões que valem registrar:

**Zero e "não sei" são coisas diferentes.** `somaOuNull()` devolve `null`
quando nenhuma campanha tem conversão rastreada, em vez de somar zeros.
Mostrar "0 resultados" onde não há rastreamento seria afirmar que o evento
não deu retorno.

**A referência exclui o próprio.** A faixa contra a qual um ministério é
comparado não inclui as campanhas dele — comparar alguém consigo mesmo não
diz nada. Há teste específico para isso.

## De-para de status do Asana (migration 0031)

### O problema

O sync resolvia o status de toda demanda assim:

```js
status: task.completed ? "concluida" : "em_producao"
```

A plataforma modela **14 status**, o banco aceita os 14, a interface
desenha os 14 — e os dados tinham **dois**. Na prática:

- o estágio **"Com o ministério"** (a leitura mais acionável do painel)
  nunca acontecia, porque nenhum dos três status que o compõem era
  gravado;
- `prioridade` e `tipo_servico` nunca eram escritos, então a coluna
  Prioridade ficava vazia;
- `data_conclusao` nunca era escrita e `data_solicitacao` caía no
  `default current_date` da coluna (a data em que o sync rodou), o que
  tornava **tempo de ciclo incalculável**.

O dado sempre esteve no Asana: a **coluna do quadro** em que o card está.
O script só não pedia esse campo.

### Como funciona agora

O sync pede `memberships.section.name` (a coluna), `completed_at` e
`created_at`, e resolve o status nesta ordem:

1. **Concluído no Asana** → `concluida`, esteja em que coluna estiver.
2. **Regra do ministério** para aquela coluna.
3. **Regra global** para aquela coluna.
4. **Nada casou** → `em_producao`, exatamente o comportamento anterior.

Subtarefa não é card de quadro e vem sem coluna — cai no passo 4, que é o
correto.

### Onde se configura

`/dashboard/admin/asana`. A tela **não pede que ninguém digite nome de
coluna**: o sync registra em `asana_secoes` toda coluna que encontrou, com
quantas tarefas tem em cada uma, e a tela oferece essa lista. Cada linha
mostra de onde veio o valor em vigor (regra do ministério, regra global ou
padrão) — sem isso ninguém entende por que dois quadros com a mesma coluna
se comportam diferente.

A migration já cadastra regras globais para os nomes de coluna mais comuns
em quadro de agência em português, para a tela não nascer vazia. Tudo é
editável e apagável pela interface.

### Testes

A regra de status é a decisão mais sensível do pipeline — é ela que define
em que estágio cada demanda aparece para o cliente. A lógica pura vive em
`scripts/asana-status.mjs`, separada do I/O justamente para ser testável:

```bash
npm run test:asana-status
```

13 testes cobrindo normalização de acento e caixa, precedência
ministério > global > padrão, card em mais de um projeto, subtarefa sem
coluna, e a garantia de que um de-para vazio preserva exatamente o
comportamento anterior.

## Histórico de status (migration 0030)

A `audit_log` existe desde a migration 0004 e **nunca recebeu uma linha** —
nenhum ponto do código escrevia nela. Sem isso a plataforma guarda apenas
o estado atual de cada demanda, campanha e entrega, e não o caminho até
ele, o que impede calcular tempo por etapa, gargalo do fluxo e retrabalho.

A `0030_historico_status_e_indices.sql` liga isso por **trigger no banco**,
e não por código na aplicação, porque o status é escrito de três lugares
diferentes (server actions do portal, `sync-asana.mjs` com service role, e
o SQL Editor do Supabase) — um trigger é o único ponto por onde os três
passam.

Registra transição de `demands.status`, `campaigns.saude`, `campaigns.fase`,
`campaigns.publicada` e `deliverables.status`. Só grava quando o valor
muda de fato (`when (old.x is distinct from new.x)` no próprio trigger),
o que importa porque o sync do Asana faz upsert de todas as demandas a
cada rodada — sem esse filtro o log ganharia milhares de linhas idênticas
por dia.

`actor_id` vem null quando quem escreveu foi a service role. Isso é
informação, não defeito: separa mudança feita por uma pessoa de mudança
vinda da automação.

Rode a migration no SQL Editor do Supabase como as outras. Ela é aditiva
e pode ser executada mais de uma vez sem efeito colateral.

## Design system ("Signal")

A camada de apresentação inteira segue um sistema único, em
`src/components/ui`. **Nenhuma tela escreve cor, raio, sombra ou tamanho
de fonte à mão** — tudo sai dos tokens abaixo. Foi assim que o produto
deixou de ter um visual por página.

### Tokens

Definidos como variáveis CSS em `src/app/globals.css` e mapeados no
`tailwind.config.ts`. Cada um tem valor próprio no tema claro e no escuro,
então o mesmo `bg-surface` resolve sozinho nos dois — o produto quase não
usa prefixo `dark:`.

| Grupo | Tokens |
|---|---|
| Superfície | `canvas`, `canvas-sunken`, `surface`, `surface-raised`, `surface-sunken`, `surface-inverse` |
| Linha | `line`, `line-strong`, `line-inverse` |
| Tinta | `ink`, `ink-2`, `ink-3`, `ink-inverse` |
| Estado | `success`, `warning`, `danger`, `info` — cada um com `-soft` (fundo de badge) e `-line` (borda) |
| Marca | `brand-50..900`, `walnut-50..950` — continuam vindo do banco (`site_theme`), injetados pelo layout raiz |
| Gráfico | `chart-1..8`, `chart-accent`, `stage-*` |

Todos os pares texto/fundo foram conferidos: **>= 4,5:1 (WCAG AA) nos dois
temas**. Antes o produto usava `text-neutral-400` sobre branco (3,1:1 —
reprovado) em cerca de cem lugares.

### Tema claro e escuro

O tema é um atributo `data-theme` no `<html>`, escrito por
`src/components/ThemeScript.tsx` **antes da primeira pintura** (script
síncrono no `<head>`) — por isso não existe lampejo branco em quem prefere
escuro. A ordem de decisão é: escolha salva pelo usuário no
`localStorage` > preferência do sistema. O botão no header troca as duas
coisas.

### Tipografia

- **Inter** — interface e texto corrido.
- **IBM Plex Mono** — rótulo (eyebrow), identificador (`DEM-2026-0042`),
  eixo de gráfico e número em tabela. Não é enfeite: alinha dígito com
  dígito e separa rótulo de dado sem gastar mais uma cor.

A escala é fechada e cada degrau já carrega entrelinha, entreletra e peso:
`text-display`, `text-h1..h4`, `text-body`, `text-body-lg`, `text-small`,
`text-caption`, `text-label`, `text-metric[-sm|-lg]`.

### Componentes

`src/components/ui/index.ts` exporta tudo. Os principais:

- **Ação** — `Button`, `IconButton`
- **Formulário** — `Field`, `Input`, `Textarea`, `Select`, `SearchInput`,
  `Checkbox`, `Radio`, `Switch`
- **Superfície** — `Section` (agrupa por significado, sem caixa), `Card`
  (unidade autônoma), `Panel` (caixa com cabeçalho), `Divider`
- **Dado** — `Metric`, `MetricRow`, `Progress`, `BarRow`, `Badge`,
  `CodeTag`, `Delta`
- **Estrutura** — `Tabs`, `Breadcrumb`, `Pagination`, `Tooltip`,
  `DropdownMenu`, `Modal`, `Drawer`, `Toast`
- **Tabela** — `Table`, `THead`, `TH`, `TBody`, `TR`, `TD`, `TableScroll`,
  `TableEmpty`
- **Estado** — `EmptyState`, `ErrorState`, `Alert`, e os skeletons
- **Ícones** — `Icon.*`, cerca de 60 ícones inline (sem dependência nova)

Regra de superfície: se tudo vira `Card`, nada tem hierarquia. Um `Card`
dentro de outro `Card` é sinal de que o de fora deveria ser `Section`.

### Visualização de dados

`src/components/charts`. A sequência categórica (`--chart-1..8`) **não foi
escolhida a olho** — passou por verificação nas seis checagens (faixa de
luminosidade, piso de croma, separação sob protanopia/deuteranopia/
tritanopia, piso de visão normal e contraste) em claro e escuro. Pior par
adjacente: ΔE 9,1 / 8,4 sob daltonismo e 19,6 / 19,3 em visão normal.

Regras que valem para qualquer gráfico novo:

1. Atribuir os slots **sempre nesta ordem, nunca ciclando**. Passando de 8
   séries, agrupar o excedente em "Outros" — cor gerada na hora é
   indistinguível de outra sob daltonismo.
2. **Nunca dois eixos Y.** Medidas de escala diferente viram dois gráficos
   ou são indexadas.
3. Série única usa a cor de marca (`--chart-accent`); comparação de
   momentos do mesmo conceito usa **ênfase** (um destacado, o resto cinza).
4. Duas ou mais séries exigem legenda, e todo gráfico carrega a
   tabela-sombra (`ChartDataTable`) para leitor de tela.

### Estágios de demanda

`src/lib/demandStages.ts` dobra os 14 status em 5 estágios (`fila`,
`producao`, `ministerio`, `concluida`, `parada`). Os 14 continuam valendo
no filtro, no badge e no detalhe — o agrupamento existe para gráfico e
para o filtro rápido, porque 14 categorias num gráfico é ilegível. O tom
de cor de cada status deriva do estágio (`src/lib/statusColors.ts`), em vez
de ser escolhido caso a caso.

### Linguagem de métricas

`src/lib/metricLanguage.ts` define, para cada indicador, o nome, o formato,
a explicação em português claro e a direção (`betterWhen`). É o que faz
"CPA" aparecer como "Custo por resultado" com tooltip explicativo, e o que
garante que uma alta de custo seja pintada de vermelho e não de verde.

### Responsividade

| Faixa | Navegação | Conteúdo |
|---|---|---|
| `< sm` (640) | Drawer | 1 coluna; tabela vira lista de cards; KPI em 2 colunas com número menor |
| `sm–lg` | Drawer | 2 colunas; colunas secundárias da tabela somem |
| `>= lg` (1024) | Sidebar fixa, recolhível (a escolha fica no `localStorage`) | Grades completas |

### Impressão

`globals.css` tem uma folha `@media print`: força tema claro, some com
sidebar, header e toda ação (`data-print="hide"`), evita quebrar card no
meio (`data-print-block`) e imprime o destino dos links. É o que faz o
relatório de evento sair completo em PDF — e é também por isso que aquela
tela usa âncoras de seção em vez de abas: aba esconde conteúdo, e conteúdo
escondido não é impresso nem encontrado pelo Ctrl+F.

## Páginas

Lado do ministério (leitor/colaborador/aprovador/supervisor — somente
leitura nesta fase, conforme o PRD):

- `/dashboard` — Início: resumo de demandas, campanhas ativas, próximos
  prazos e entregas recentes
- `/dashboard/demandas` — lista e detalhe de cada demanda
- `/dashboard/campanhas` — lista e detalhe de campanhas/eventos, com
  progresso calculado pelos marcos (pesos)
- `/dashboard/entregas` — biblioteca de entregas com link
- `/dashboard/acesso` — "Meu acesso": quais ministérios e papéis o usuário
  tem

Lado da Comunicação (`papel_global` = `gestor_comunicacao` ou
`administrador_tecnico`):

- `/dashboard/admin` — painel consolidado com demandas ativas/atrasadas e
  campanhas em risco por ministério
- `/dashboard/admin/campanhas-pendentes` ("Campanhas ativas" no menu) —
  lista única de todas as campanhas/eventos, agrupadas por ministério e
  organizáveis em pastas (útil pra evento anual recorrente, ex: pasta
  "Festa da Roça" com uma campanha por edição). Toda campanha nasce oculta
  pro ministério (nova, vinda de tag do Asana, ou antiga já cadastrada); um
  toggle por linha abre/oculta, sem precisar de duas telas separadas
- `/dashboard/admin/ministerios` — lista e cadastro de ministérios (não
  precisa mais do Table Editor pra isso)
- `/dashboard/admin/usuarios` — lista de usuários com papel e vínculos, e
  formulário pra criar novo usuário (cria a conta no Supabase Auth já
  confirmada, e opcionalmente já define papel global e/ou vínculo com um
  ministério)

As rotas antigas (`/dashboard/asana`, `/meta-ads`, `/eventos`,
`/configuracoes`) continuam existindo só como redirecionamento pras novas,
pra não quebrar links salvos.

## Como isso funciona

1. Cada ministério é uma linha em `ministries`.
2. Cada usuário do Supabase Auth pode estar vinculado a um ou mais
   ministérios via `ministry_members`, com um papel por vínculo (`leitor`,
   `colaborador`, `aprovador`, `supervisor` ou `atendimento`).
3. Além disso, um usuário pode ter um `papel_global` em `profiles`
   (`atendimento`, `gestor_comunicacao` ou `administrador_tecnico`) que dá
   acesso a **todos** os ministérios, sem precisar de vínculo um a um — é
   assim que a Comunicação enxerga a carteira inteira.
4. Quando o usuário tem acesso a mais de um ministério, aparece um seletor
   no topo da barra lateral (guarda a escolha num cookie).
5. O dashboard nunca chama Asana/Meta/e-inscrição diretamente. Ele lê das
   tabelas `demands`, `campaigns`, `deliverables`, que são alimentadas por
   cadastro manual (Supabase Studio, por enquanto) ou por
   `scripts/sync-asana.mjs`.
6. RLS (Row Level Security) do Postgres garante isolamento: mesmo que
   alguém tente burlar o frontend, o banco só devolve dados dos ministérios
   aos quais o usuário tem vínculo (ou dados de tudo, se for Comunicação).
   Escrita (criar/editar demanda, campanha etc.) só é permitida pra quem
   pode editar aquele ministério — líderes de ministério têm só leitura
   nesta fase, como o PRD define.

## Passo a passo pra rodar

### 1. Criar o projeto no Supabase (pule se já tiver um)

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um novo
   projeto.
2. Clique em **Connect** no topo do projeto, escolha **Next.js** e copie a
   `Project URL` e a `anon public key`. A `service_role key` fica em
   **Settings > API Keys**.

### 2. Rodar as migrations

No SQL Editor do Supabase, rode nesta ordem (pule as que já rodaram antes):
`0001_init.sql`, `0002_asana_tasks.sql`, `0003_metrics_unique.sql`,
`0004_portal_ministerios_fase1.sql`.

> **Se um arquivo vier truncado.** Script longo colado no SQL Editor às vezes
> é cortado no meio, e o Postgres recusa o arquivo inteiro apontando para um
> lugar onde não há nada de errado (`syntax error at or near ";"` ou
> `syntax error at end of input`). Para as migrations `0030`, `0031` e `0032`
> existe uma versão sem comentários, com menos da metade do tamanho, em
> [`supabase/migrations/para-colar/`](supabase/migrations/para-colar/) — mesmo
> SQL, e dividida em partes que podem ser coladas uma de cada vez.

Opcionalmente, rode também `supabase/seed.sql` pra ter um ministério,
campanha e demanda de exemplo.

### Ver a interface sem um banco alcançável

Para revisar a interface é preciso vê-la, e ver a interface exige dados.
`QA_MOCK=1` troca o transporte do Supabase por fixtures e deixa a
plataforma inteira rodar sem banco — útil para revisão visual e para os
casos que o banco real não tem de propósito (ministério vazio, valor de
sete dígitos, título de 140 caracteres):

```bash
QA_MOCK=1 npm run build && QA_MOCK=1 npm start
node scripts/qa/varredura.mjs   # varre as telas em 4 larguras e 2 temas
```

A varredura reprova erro de console, rolagem horizontal, elemento que
transborda o viewport e alvo de toque menor que 24px. Detalhes em
[`scripts/qa/README.md`](scripts/qa/README.md).

### 3. Configurar as variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `.env.local` com a URL e as chaves copiadas no passo 1.

### 4. Instalar dependências e rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### 5. Criar seu primeiro usuário

Ainda não existe tela de autocadastro — nesse modelo, é a Comunicação quem
concede o acesso de cada pessoa. Pra criar o primeiro usuário:

1. No painel do Supabase, vá em **Authentication > Users > Add user**.
2. Crie um usuário com e-mail e senha.
3. Decida o tipo de acesso e rode um dos comandos no SQL Editor:

   ```sql
   -- Acesso de leitor a UM ministério específico:
   insert into ministry_members (ministry_id, user_id, role)
   values ('<id-do-ministerio>', '<id-do-usuario>', 'leitor');

   -- OU acesso de Comunicação (enxerga todos os ministérios):
   update profiles set papel_global = 'gestor_comunicacao'
   where id = '<id-do-usuario>';
   ```

4. Faça login em `/login` com esse e-mail e senha.

### 6. Cadastrar ministérios, demandas e campanhas

Por enquanto (Fase 1, conforme o PRD — seção 14.2: "MVP: cadastro manual e
importação por planilha") o cadastro é feito direto no **Table Editor** do
Supabase Studio: tabelas `ministries`, `campaigns`, `milestones`, `demands`,
`deliverables`. Uma tela de administração pra fazer isso pelo próprio
portal é um próximo passo natural, fora do escopo desta etapa.

## Conectar o Asana

1. Gere um **Personal Access Token** na sua conta do Asana: avatar >
   *Configurações* > aba *Apps* > *Gerenciar Developer Apps* > *Create New
   Personal Access Token*. Use a conta da agência (a mesma que já gerencia
   os projetos dos ministérios), não a de um usuário individual.
2. Adicione o token em `.env.local`:

   ```
   ASANA_ACCESS_TOKEN=seu-token-aqui
   ```

3. Para cada ministério, descubra o **gid do projeto** Asana correspondente
   (está na URL do projeto, ex: `app.asana.com/0/1212386890591811/...` → o
   gid é `1212386890591811`) e cadastre o vínculo:

   ```sql
   insert into data_sources (ministry_id, source, external_id)
   values ('<id-do-ministerio>', 'asana', '<gid-do-projeto>');
   ```

   (o modelo assume **1 projeto Asana = 1 ministério** — se um ministério
   tiver o trabalho espalhado em vários projetos, dá pra evoluir isso pra
   aceitar múltiplos `data_sources` por ministério)

4. Rode a sincronização:

   ```bash
   npm run sync:asana
   ```

   Isso busca as tarefas de cada projeto vinculado e grava direto na tabela
   `demands` (`fonte_externa = 'asana'`), marcando tarefa concluída do
   Asana como status `concluida` e as demais como `em_producao`. Campos
   preenchidos manualmente no portal (escopo, observação publicada, etc.) não
   são sobrescritos pelo sync. Rode de novo sempre que quiser atualizar.

   Em produção isso já está agendado via um **Cron Job** no Render, que roda
   `node scripts/sync-asana.mjs` periodicamente com as mesmas 3 variáveis de
   ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ASANA_ACCESS_TOKEN`).

   **Tags do Asana viram campanhas/eventos**: toda tag de uma tarefa vira
   uma campanha/evento vinculado no portal — uma demanda pode estar em
   várias campanhas ao mesmo tempo (tabela `demand_campaigns`), do mesmo
   jeito que uma tarefa pode ter várias tags no Asana. Cada tag nova cria
   automaticamente uma campanha (tipo `campanha` por padrão; a Comunicação
   pode editar o nome e o tipo depois em "Campanhas ativas"). Se você
   tirar uma tag de uma tarefa no Asana, o próximo sync desfaz o vínculo
   correspondente no portal. Tarefas sem tag ficam sem campanha vinculada.

   **Toda campanha nasce oculta** (não só a vinda de tag): ela não aparece
   pro ministério na aba Campanhas até a Comunicação ativar o toggle de
   visibilidade em `/dashboard/admin/campanhas-pendentes` ("Campanhas
   ativas" no menu). As demandas sincronizam e ficam vinculadas
   normalmente nesse meio tempo; só a campanha em si fica invisível pro
   ministério até ser ativada. Isso vale também pras campanhas que já
   existiam antes dessa regra — a migration `0010` escondeu todas de uma
   vez, pra não poluir a tela do ministério com evento antigo. Dá pra
   excluir uma campanha que não faça sentido mais — as demandas vinculadas
   a ela voltam a ficar sem campanha.

   **Pastas de campanha** (migration `0012`): dentro de cada ministério,
   dá pra criar pastas e mover campanhas pra dentro delas — útil pra
   eventos anuais recorrentes (ex: pasta "Festa da Roça" contendo "Festa
   da Roça 2025", "Festa da Roça 2026" etc). Cada campanha só pode estar
   em uma pasta por vez (ou em nenhuma — fica em "Sem pasta"), e dá pra
   reordenar tanto as pastas quanto as campanhas dentro delas com as
   setinhas pra cima/baixo.

## Deploy (GitHub + Render)

Se você já tinha um repositório no GitHub e um Web Service no Render da
versão anterior: substitua os arquivos deste projeto pelos daquele
repositório local, comite e dê push — o Render redeploya sozinho a cada
push (se o *auto-deploy* estiver ligado). Não esqueça de rodar a migration
`0004` no Supabase antes de usar o app com a nova estrutura.

Se está começando do zero:

### 1. Criar o repositório no GitHub

1. Em [github.com/new](https://github.com/new), crie um repositório vazio.
2. No terminal, dentro desta pasta:

   ```bash
   git init -b main
   git add -A
   git commit -m "Portal dos Ministérios - Fase 1"
   git remote add origin https://github.com/<seu-usuario>/<nome-do-repo>.git
   git push -u origin main
   ```

### 2. Criar o serviço no Render

1. Em [render.com](https://render.com), crie uma conta e conecte sua conta
   do GitHub.
2. **New > Web Service**, selecione o repositório criado no passo 1.
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Em **Environment**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.

**Atualização importante:** a `SUPABASE_SERVICE_ROLE_KEY` agora também
precisa estar no Web Service (não só num Cron Job separado) — as páginas
`/dashboard/admin/usuarios` usam ela pra criar contas de usuário pela API
de administração do Supabase Auth. Ela nunca é enviada pro navegador (só é
lida dentro de Server Actions, que rodam no servidor), mas se você já tinha
criado o Web Service sem essa variável, precisa entrar em **Environment**
no painel do Render e adicionar agora.

O `ASANA_ACCESS_TOKEN` continua só sendo necessário se/quando você
configurar um **Cron Job** separado pra rodar `npm run sync:asana`.

**Nunca** commite o `.env.local` — ele já está no `.gitignore`.

## Próximos passos (fora do escopo desta etapa)

Seguindo o backlog por fases do PRD (seção 19):

- **Fase 2 — Transparência e decisão**: investimentos (mídia paga
  inclusive), pontos de esforço, reuniões/atas/decisões, aprovações,
  comentários formais, notificações, busca e filtros avançados, relatórios
  e exportação.
- Telas de cadastro/edição pelo próprio portal (hoje é direto no Supabase
  Studio) — demandas, campanhas e ministérios.
- Agendar o `sync:asana` pra rodar sozinho periodicamente.
- Job de sincronização com a **Meta Marketing API** (exige Business Manager
  verificado e App Review — tem lead time de aprovação) — parte de
  Investimentos (Fase 2).
- Integração com a **e-inscrição** (sem API pública documentada — confirmar
  com o suporte deles).
