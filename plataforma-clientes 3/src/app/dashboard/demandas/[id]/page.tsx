import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemandById, getChildDemands, isOverdue, STATUS_LABEL, PRIORIDADE_LABEL } from "@/lib/data/demands";
import { getCampaignsForDemandsInMinistry } from "@/lib/data/campaigns";
import { getCommentsForDemand } from "@/lib/data/comments";
import { getDeliverablesForDemand } from "@/lib/data/deliverables";
import { getCurrentUser, isComunicacaoGlobal } from "@/lib/data/ministries";
import { statusTone } from "@/lib/statusColors";
import { STAGE_META, stageOf } from "@/lib/demandStages";
import {
  Alert, Badge, Button, CodeTag, Icon, Panel, Progress, Section, Divider, Breadcrumb,
} from "@/components/ui";
import { DeliverableCard } from "@/components/DeliverableCard";
import { CommentsSection } from "./CommentsSection";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Linha rótulo/valor. Rótulo em mono maiúsculo e valor em texto normal:
 *  o par lê como ficha técnica, e é o mesmo tratamento usado na tela de
 *  campanha — antes cada tela inventava o seu. */
function Fact({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 flex items-center gap-1.5 font-mono text-label uppercase text-ink-3">
        {icon}
        {label}
      </p>
      <div className="text-small text-ink">{children}</div>
    </div>
  );
}

export default async function DemandaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demand = await getDemandById(id);
  if (!demand) notFound();

  const [campaignsMap, children, comments, currentUser, deliverables] = await Promise.all([
    getCampaignsForDemandsInMinistry(demand.ministry_id),
    getChildDemands(demand.id),
    getCommentsForDemand(demand.id),
    getCurrentUser(),
    getDeliverablesForDemand(demand.id),
  ]);

  const campaigns = campaignsMap.get(demand.id) ?? [];
  const canApproveDeliverable = isComunicacaoGlobal(currentUser);
  const atrasada = isOverdue(demand);
  const stage = STAGE_META[stageOf(demand.status)];

  const childrenDone = children.filter((c) => c.status === "concluida").length;
  const childProgress = children.length > 0 ? (childrenDone / children.length) * 100 : null;

  return (
    <div className="mx-auto max-w-report space-y-5">
      <Breadcrumb
        items={[
          { label: "Demandas", href: "/dashboard/demandas" },
          { label: demand.identificador ?? "Detalhe" },
        ]}
        className="mb-1"
      />

      {/* ---------- Cabeçalho ---------- */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          {demand.identificador && <CodeTag>{demand.identificador}</CodeTag>}
          <Badge tone={statusTone(demand.status)} dot>
            {STATUS_LABEL[demand.status] ?? demand.status}
          </Badge>
          {demand.prioridade && (demand.prioridade === "urgente" || demand.prioridade === "alta") && (
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
      </div>

      {demand.pendencia_atual && (
        <Alert tone="warning" title="Pendência atual">
          {demand.pendencia_atual}
        </Alert>
      )}

      {/* ---------- Ficha ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {(demand.descricao_objetiva || demand.escopo_acordado) && (
            <Panel title="O que foi combinado">
              <div className="space-y-4">
                {demand.descricao_objetiva && (
                  <Fact label="Descrição">
                    <p className="whitespace-pre-line leading-relaxed">{demand.descricao_objetiva}</p>
                  </Fact>
                )}
                {demand.escopo_acordado && (
                  <>
                    <Divider />
                    <Fact label="Escopo acordado">
                      <p className="whitespace-pre-line leading-relaxed">{demand.escopo_acordado}</p>
                    </Fact>
                  </>
                )}
                {demand.dependencias && (
                  <>
                    <Divider />
                    <Fact label="Dependências">
                      <p className="whitespace-pre-line leading-relaxed">{demand.dependencias}</p>
                    </Fact>
                  </>
                )}
                {demand.observacao_publicada && (
                  <>
                    <Divider />
                    <Fact label="Observação">
                      <p className="whitespace-pre-line leading-relaxed">{demand.observacao_publicada}</p>
                    </Fact>
                  </>
                )}
              </div>
            </Panel>
          )}

          {children.length > 0 && (
            <Panel
              title={`Subtarefas (${children.length})`}
              description={childProgress !== null ? `${childrenDone} de ${children.length} concluídas` : undefined}
              noPadding
            >
              {childProgress !== null && (
                <div className="border-b border-line px-4 py-3 sm:px-5">
                  <Progress value={childProgress} tone={childProgress === 100 ? "success" : "accent"} />
                </div>
              )}
              <ul className="divide-y divide-line">
                {children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/dashboard/demandas/${child.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-120 hover:bg-surface-sunken sm:px-5"
                    >
                      <span className="min-w-0 flex-1 truncate text-small text-ink">{child.titulo}</span>
                      <Badge tone={statusTone(child.status)} size="sm" dot>
                        {STATUS_LABEL[child.status] ?? child.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {/* ---------- Coluna lateral: fatos ---------- */}
        <Panel title="Ficha" className="lg:col-span-1 lg:self-start">
          <div className="space-y-4">
            <Fact label="Tipo de serviço">{demand.tipo_servico ?? "—"}</Fact>
            <Fact label="Prioridade">
              {demand.prioridade ? PRIORIDADE_LABEL[demand.prioridade] ?? demand.prioridade : "—"}
            </Fact>
            <Divider />
            <Fact label="Prazo acordado" icon={<Icon.Calendar className="h-3 w-3" />}>
              <span className={atrasada ? "font-medium text-danger" : undefined}>
                {formatDate(demand.prazo_acordado)}
              </span>
            </Fact>
            <Fact label="Concluída em" icon={<Icon.CheckCircle className="h-3 w-3" />}>
              {formatDate(demand.data_conclusao)}
            </Fact>
            {demand.link_origem && (
              <>
                <Divider />
                <Fact label="Origem">
                  <a
                    href={demand.link_origem}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-6 items-center gap-1.5 text-brand-600 underline-offset-4 hover:underline"
                  >
                    Abrir no {demand.fonte_externa === "asana" ? "Asana" : "sistema de origem"}
                    <Icon.External className="h-3 w-3" />
                  </a>
                </Fact>
              </>
            )}
            <Divider />
            <p className="text-caption text-ink-3">
              Atualizada em{" "}
              <time dateTime={demand.updated_at}>
                {new Date(demand.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </time>
            </p>
          </div>
        </Panel>
      </div>

      {deliverables.length > 0 && (
        <Section
          eyebrow="Material"
          title={`Entregas desta demanda (${deliverables.length})`}
          description="Peças e arquivos finais vinculados."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {deliverables.map((d) => (
              <DeliverableCard key={d.id} deliverable={d} canApprove={canApproveDeliverable} />
            ))}
          </div>
        </Section>
      )}

      <CommentsSection
        demandId={demand.id}
        comments={comments}
        currentUserId={currentUser?.id ?? null}
        canModerate={isComunicacaoGlobal(currentUser)}
      />
    </div>
  );
}
