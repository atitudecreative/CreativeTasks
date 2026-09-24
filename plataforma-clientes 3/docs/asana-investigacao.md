# Por que o cron encontra 1 tarefa quando o Asana tem 20

Investigação do sync `scripts/sync-asana.mjs` (o que roda no Cron Job do
Render) a partir do sintoma relatado: **a tag `Funday` tem várias demandas
no Asana e o portal mostra uma só.**

Este documento tem duas partes: o que ficou **provado lendo o código** (e
já foi corrigido), e o que **só a rodada com o token de verdade responde**
— para isso existe o `scripts/diagnostico-asana.mjs`.

---

## A primeira coisa que NÃO é

A paginação já estava certa. `fetchAllTasks` e `fetchSubtasks` sempre
percorreram todas as páginas (`next_page.offset`, `limit=100`) até o fim.

Ou seja: **aumentar o limite para 100 não mudaria nada** — o limite já era
100 e o laço já seguia para a página seguinte. Se o problema fosse esse, o
portal mostraria 100 tarefas, não 1.

---

## O que estava errado (provado por leitura, corrigido)

### A. Subtarefa órfã sumia inteira, sem log — `syncMinistry`

```js
const topLevelTasks = allTasks.filter((t) => !t.parent);
```

A listagem do quadro devolve tudo que é card — inclusive subtarefas que
alguém arrastou para o quadro como card independente. Todas as que tinham
`parent` eram descartadas aqui, no raciocínio de que entrariam depois pela
varredura a partir do pai.

Isso só vale **quando o pai está no mesmo quadro**. Quando o pai vive em
outro projeto (ou em nenhum), ninguém nunca desce até ela: o filtro jogava
fora e a varredura nunca chegava lá. A tarefa desaparecia do portal sem
uma linha de log.

Corrigido em `scripts/asana-arvore.mjs` (`raizesDoQuadro`): essas órfãs
voltam como raiz da varredura. Testado em `asana-arvore.test.mjs`.

### B. Rajada de requisições estourando o limite de taxa — `collectTaskTree`

O sync pedia `/tasks/{gid}/subtasks` para **toda** tarefa, inclusive as
folhas, que nunca têm filhas. Num quadro de 1.500 cards são 1.500
requisições disparadas o mais rápido que o laço consegue, quase todas para
receber lista vazia. O limite do Asana é 150/min no plano gratuito e
1.500/min nos pagos.

Pior: quando o limite estourava, o 429 virava exceção que caía num
`catch` com a mensagem *"Pulando essa ramificação"*. Um limite de taxa
passageiro **apagava um galho inteiro da árvore** e a rodada terminava
dizendo que deu tudo certo.

Corrigido em duas frentes:

- `num_subtasks` agora vem nos `opt_fields`; folha declarada pelo Asana
  não gera requisição nenhuma;
- `scripts/asana-client.mjs` põe espaçamento mínimo entre requisições,
  respeita o cabeçalho `Retry-After` do 429, tenta de novo em 5xx e falha
  de rede, e **não** insiste em 401/403/404 (esses não melhoram com
  repetição). O erro que sobrar é contado e vira alerta no fim da rodada.

### C. Tarefa repetida derrubava o lote inteiro

A mesma tarefa podia ser alcançada por dois caminhos (card do quadro e
subtarefa de outro card). O upsert recebia o mesmo
`(ministry_id, asana_task_gid)` duas vezes no mesmo lote e o Postgres
recusa o **lote inteiro** com `ON CONFLICT DO UPDATE command cannot affect
row a second time` — uma tarefa repetida levava junto até 300 demandas.
Agora há controle de duplicidade por gid, com teste.

### D. Campanha casada pelo NOME da tag, não pelo ID

```js
const key = tagName.trim().toLowerCase();
```

Nome é o único dado da tag que muda. No dia em que alguém renomeia
`Funday` para `Funday 2026`, o sync conclui que é uma tag nova e cria uma
**segunda** campanha: a antiga fica com todas as demandas anteriores, a
nova nasce vazia e pendente. O portal passa a mostrar duas coisas com
quase o mesmo nome, nenhuma completa.

Corrigido: a migration `0033` acrescenta `campaigns.asana_tag_gid` e o
sync passa a casar por gid, adotando o gid das campanhas que já existem
na primeira rodada. Renomear a tag no Asana agora **renomeia** a campanha.

### E. Resposta inesperada virava erro sem sentido

`tasks.push(...json.data)` sem guarda: um 200 sem `data` estourava
`json.data is not iterable`, mensagem que não diz nada sobre o que houve.
Agora a resposta é conferida e o erro cita o corpo recebido.

### F. O log não permitia descobrir nada

O log antigo dizia "X demandas gravadas" e parava aí. Agora toda rodada
termina com um relatório: páginas consultadas, tarefas listadas, órfãs
recuperadas, repetidas ignoradas, folhas puladas, requisições, esperas por
limite de taxa, gravadas, não gravadas, **contagem por tag** e alertas.

### G. Detecção de anomalia

O sync nunca apaga demanda — então o que já está no banco é piso.
Encontrar **menos** tarefas do que já existem gravadas é sinal de perda no
caminho, e agora vira alerta (com o número exato da diferença) e faz a
rodada terminar com código de erro, que é o que aparece no painel do
Render. Não é um limite arbitrário: a comparação é com o número real da
rodada anterior.

---

## O que só a rodada de verdade responde

Duas hipóteses fortes **não** dá para confirmar sem falar com a API do
Asana e com o banco de produção:

### 1. Escopo: tag é do workspace, o sync é do projeto

`data_sources.external_id` guarda **um projeto** do Asana por ministério, e
o sync só olha esses projetos. Uma tag do Asana é do **workspace inteiro**.
Toda tarefa com `Funday` que estiver fora dos projetos cadastrados é
invisível para o cron — não por defeito, mas por desenho.

Se a investigação apontar para cá, existem duas saídas, e **essa é uma
decisão de produto, não de código**:

- cadastrar em `data_sources` os outros projetos onde as tarefas moram; ou
- passar a varrer também por tag (`GET /tags/{gid}/tasks`), o que traria
  para o portal tarefas de projetos que hoje ninguém acompanha.

### 2. A campanha pode estar correta e escondida

Campanha criada a partir de tag nasce `publicada = false` (migration
`0010`), e `listCampaigns` filtra `.eq("publicada", true)`. É o desenho
atual: a Comunicação abre o evento em
`/dashboard/admin/campanhas-pendentes`. Ou seja, o cron pode estar
trazendo as 20 tarefas e o portal continuar mostrando 1 porque a campanha
certa ainda está pendente — ou porque existem duas campanhas `Funday`, uma
publicada com 1 demanda e outra pendente com 19 (é exatamente o estrago do
defeito D).

---

## Como rodar a investigação

Com o **mesmo token** que o Render usa (permissão é por token — rodar com
outro responde sobre um mundo diferente do que o cron enxerga):

```bash
npm run diagnostico:asana                 # tag "Funday"
npm run diagnostico:asana -- --tag=Natal
npm run diagnostico:asana -- --json > relatorio.json
```

O script **não grava nada**. Ele compara dois universos:

- **universo A** — tudo que o Asana tem com a tag, perguntando direto pela
  tag (escopo de workspace);
- **universo B** — tudo que o cron alcança hoje (escopo de projeto, mais o
  caminho da árvore de subtarefas).

E responde, com número e id na mão:

- quantos workspaces o token enxerga, e se existe **mais de uma tag com o
  mesmo nome** (causa clássica: são duas tags diferentes, uma com 19
  tarefas e outra com 1);
- o **ID** da tag — não o nome;
- quantas páginas foram consultadas e quantas tarefas vieram;
- quantas estão concluídas, quantas são subtarefas, quantas estão em
  projeto arquivado, quantas não estão em projeto nenhum;
- a lista de ids, com o projeto de cada uma;
- **quais o cron perde e por quê**, uma linha por tarefa, com o motivo;
- quantas dessas tarefas existem como demanda no banco;
- quantas campanhas com esse nome existem, se estão publicadas e quantas
  demandas cada uma tem.

A saída da etapa 4 (`PERDIDAS`, com o resumo por motivo) é a resposta à
pergunta que importa: *por que 19 estão sendo perdidas?*

---

## Ordem de execução recomendada

1. Rodar as migrations pendentes no SQL Editor:
   `0030_fix_identificador_loop_lento` → `0030_historico_status_e_indices`
   → `0031` → `0032` → `0033`.
2. `npm run diagnostico:asana` — guardar a saída.
3. `npm run sync:asana` — conferir o **relatório da rodada** no fim do log
   (contagem por tag, alertas).
4. `npm run diagnostico:asana` de novo — comparar: as tarefas que estavam
   em `PERDIDAS` por causa do defeito A devem ter sumido da lista.
5. Abrir `/dashboard/admin/campanhas-pendentes` e publicar a campanha, se
   for o caso.
6. Conferir a tela da campanha no portal.

O que sobrar em `PERDIDAS` depois disso cai nas duas hipóteses da seção
anterior — e aí a decisão é sua.
