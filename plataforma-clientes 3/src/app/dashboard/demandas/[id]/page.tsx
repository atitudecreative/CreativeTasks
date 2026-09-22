import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemandById, getChildDemands, isOverdue, STATUS_LABEL, PRIORIDADE_LABEL } from "@/lib/data/demands";
import { getCampaignsForDemandsInMinistry } from "@/lib/data/campaigns";
import { getCommentsForDemand } from "@/lib/data/comments";
import { getDeliverablesForDemand } from "@/lib/data/deliverables";
import { getStatusHistory } from "@/lib/data/historico";
import { getCurrentUser, isComunicacaoGlobal } from "@/lib/data/ministries";
import { carregado } from "@/lib/data/erros";
import { hoje as hojeEmBrasilia } from "@/lib/dates";
import { statusTone } from "@/lib/statusColors";
import { STAGE_META, stageOf } from "@/lib/demandStages";
import {
  Alert, Badge, Breadcrumb, CodeTag, Divider, EmptyState, Icon, PageBody, Panel,
  RailBlock, Section,
} from "@/components/ui";
import { DeliverableCard } from "@/components/DeliverableCard";
import { CommentsSection } from "./CommentsSection";
import { LinhaDoTempo } from "./LinhaDoTempo";
import { Historico } from "./Historico";
import { Subtarefas, type SubtarefaRow } from "./Subtarefas";

/* =========================================================================
   DETALHE DA DEMANDA
   -------------------------------------------------------------------------
   O que mudou, e por quê:

   1. A PÁGINA PASSA A TER TRILHO. A ficha (tipo, prioridade, prazo, origem)
      estava numa terceira coluna da grade principal, disputando espaço com
      o conteúdo. Ela é referência, não leitura — vai para o trilho, que é
      onde a plataforma inteira já põe referência, e gruda ao rolar.

   2. AS DATAS VIRARAM LINHA DO TEMPO. Eram quatro fatos soltos; agora são
      uma sequência com o tempo entre elas. É a resposta à pergunta que faz
      alguém abrir esta tela.

   3. SUBTAREFAS AGUENTAM O TAMANHO REAL. A lista mostrava todas as filhas
      de uma vez — e esta base tem tarefa com mais de 1.500. Ver Subtarefas.

   4. HISTÓRICO DE STATUS, para quem pode ler (a policy de audit_log é da
      Comunicação). Primeiro uso do registro criado na migration 0030.

   O que NÃO mudou: nenhuma regra de negócio, nenhuma query de escrita,
   nenhuma permissão. Esta tela só lê.
   ========================================================================= */

function Fato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 py-1.5">
      <p className="font-mono text-label uppercase text-ink-3">{label}</p>
      <div className="mt-0.5 text-small text-ink">{children}</div>
    </div>
  );
}

export default async function DemandaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demand = await getDemandById(id);
  if (!demand) notFound();

  const currentUser = await getCurrentUser();
  const ehComunicacao = isComunicacaoGlobal(currentUser);

  const [campaignsMap, children, comments, deliverables, historico] = await Promise.all([
    getCampaignsForDemandsInMinistry(demand.ministry_id),
    getChildDemands(demand.id),
    getCommentsForDemand(demand.id),
    getDeliverablesForDemand(demand.id),
    // A policy de audit_log só libera leitura para a Comunicação global.
    // Pedir mesmo assim devolveria lista vazia — que a tela leria como
    // "nunca mudou de status", uma afirmação falsa. Melhor não perguntar.
    ehComunicacao ? getStatusHistory(demand.id) : Promise.resolve(carregado([])),
  ]);

  const hoje = hojeEmBrasilia();
  const campaigns = campaignsMap.get(demand.id) ?? [];
  const atrasada = isOverdue(demand, hoje);
  const stage = STAGE_META[stageOf(demand.status)];

  const subtarefas: SubtarefaRow[] = children.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    identificador: c.identificador,
    status: c.status,
    prazo_acordado: c.prazo_acordado,
    atrasada: isOverdue(c, hoje),
  }));

  const temCombinado = Boolean(
    demand.descricao_objetiva || demand.escopo_acordado || demand.dependencias || demand.observacao_publicada
  );
  const semNadaParaMostrar =
    !temCombinado && subtarefas.length === 0 && deliverables.length === 0 && !demand.pendencia_atual;

  const trilho = (
    <>
      <RailBlock label="Linha do tempo">
        <LinhaDoTempo demand={demand} hoje={hoje} />
      </RailBlock>

      <RailBlock label="Ficha">
        <div className="divide-y divide-line">
          <Fato label="Tipo de serviço">{demand.tipo_servico ?? "—"}</Fato>
          <Fato label="Prioridade">
            {demand.prioridade ? PRIORIDADE_LABEL[demand.prioridade] ?? demand.prioridade : "—"}
          </Fato>
          {demand.link_origem && (
            <Fato label="Origem">
              <a
                href={demand.link_origem}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-6 items-center gap-1.5 text-brand-600 underline-offset-4 hover:underline"
              >
                Abrir no {demand.fonte_externa === "asana" ? "Asana" : "sistema de origem"}
                <Icon.External className="h-3 w-3" />
              </a>
            </Fato>
          )}
        </div>
        <p className="mt-2 text-caption text-ink-3">
          Atualizada em{" "}
          <time dateTime={demand.updated_at}>
            {new Date(demand.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </time>
        </p>
      </RailBlock>
    </>
  );

  return (
    <div className="min-w-0 space-y-5">
      <Breadcrumb
        items={[
          { label: "Demandas", href: "/dashboard/demandas" },
          { label: demand.identificador ?? "Detalhe" },
        ]}
      />

      <header className="min-w-0">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          {demand.identificador && <CodeTag>{demand.identificador}</CodeTag>}
          <Badge tone={statusTone(demand.status)} dot>
            {STATUS_LABEL[demand.status] ?? demand.status}
          </Badge>
          {(demand.prioridade === "urgente" || demand.prioridade === "alta") && (
            <Badge tone={demand.prioridade === "urgente" ? "danger" : "warning"} variant="outline">
              Prioridade {PRIORIDADE_LABEL[demand.prioridade] ?? demand.prioridade}
            </Badge>
          )}
          {atrasada && (
            <Badge tone="danger" icon={<Icon.AlertTriangle className="h-3 w-3" />}>
              Prazo vencido
            </Badge>
          )}
        </div>

        <h1 className="text-h1 text-ink">{demand.titulo}</h1>
        <p className="mt-1.5 text-small text-ink-2">{stage.description}</p>

        {campaigns.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-label uppercase text-ink-3">Faz parte de</span>
            {campaigns.map((c) => (
              <Link key={c.id} href={`/dashboard/campanhas/${c.id}`} className="inline-flex min-h-6 items-center">
                <Badge tone="accent" icon={<Icon.Megaphone className="h-3 w-3" />}>
                  {c.nome}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* railFirstOnMobile: no celular a linha do tempo tem que vir ANTES
          da lista de subtarefas. Ela é o resumo — deixá-la no fim obriga a
          rolar 50 linhas para descobrir se a demanda está atrasada. */}
      <PageBody rail={trilho} railFirstOnMobile>
        <div className="space-y-5">
          {demand.pendencia_atual && (
            <Alert tone="warning" title="Pendência atual">
              {demand.pendencia_atual}
            </Alert>
          )}

          {temCombinado && (
            <Panel title="O que foi combinado">
              <div className="space-y-4">
                {demand.descricao_objetiva && (
                  <Fato label="Descrição">
                    <p className="whitespace-pre-line leading-relaxed">{demand.descricao_objetiva}</p>
                  </Fato>
                )}
                {demand.escopo_acordado && (
                  <>
                    <Divider />
                    <Fato label="Escopo acordado">
                      <p className="whitespace-pre-line leading-relaxed">{demand.escopo_acordado}</p>
                    </Fato>
                  </>
                )}
                {demand.dependencias && (
                  <>
                    <Divider />
                    <Fato label="Dependências">
                      <p className="whitespace-pre-line leading-relaxed">{demand.dependencias}</p>
                    </Fato>
                  </>
                )}
                {demand.observacao_publicada && (
                  <>
                    <Divider />
                    <Fato label="Observação">
                      <p className="whitespace-pre-line leading-relaxed">{demand.observacao_publicada}</p>
                    </Fato>
                  </>
                )}
              </div>
            </Panel>
          )}

          {semNadaParaMostrar && (
            <EmptyState
              icon={<Icon.File className="h-5 w-5" />}
              title="Esta demanda ainda não tem detalhamento"
              description={
                demand.fonte_externa === "asana"
                  ? "Ela veio do Asana com título e status, e o restante (escopo, descrição, entregas) é preenchido no portal conforme o trabalho anda."
                  : "Escopo, descrição e entregas ainda não foram preenchidos."
              }
            />
          )}

          {subtarefas.length > 0 && <Subtarefas itens={subtarefas} />}

          {deliverables.length > 0 && (
            <Section
              eyebrow="Material"
              title={`Entregas desta demanda (${deliverables.length})`}
              description="Peças e arquivos finais vinculados."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {deliverables.map((d) => (
                  <DeliverableCard key={d.id} deliverable={d} canApprove={ehComunicacao} />
                ))}
              </div>
            </Section>
          )}

          {ehComunicacao && <Historico carga={historico} />}

          <CommentsSection
            demandId={demand.id}
            comments={comments}
            currentUserId={currentUser?.id ?? null}
            canModerate={ehComunicacao}
          />
        </div>
      </PageBody>
    </div>
  );
}
