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

Opcionalmente, rode também `supabase/seed.sql` pra ter um ministério,
campanha e demanda de exemplo.

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
