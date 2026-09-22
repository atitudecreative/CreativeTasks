import { redirect } from "next/navigation";
import Link from "next/link";
import { hoje, somaDias } from "@/lib/dates";
import { getCurrentUser, isComunicacaoGlobal } from "@/lib/data/ministries";
import { getAdminOverview } from "@/lib/data/admin";
import { getAllCampaignsAdmin } from "@/lib/data/campaigns";
import { getAllMinistries } from "@/lib/data/ministries";
import { getUniversoComparacao } from "@/lib/data/campanhaPerfil";
import { resumirCarteira } from "@/lib/carteira";
import { RankingEficiencia, VariacaoBadge } from "@/components/intel/LeituraMinisterio";
import { formatMoney, formatCompact } from "@/lib/metricLanguage";
import {
  Alert, Badge, Button, EmptyState, Icon, Metric, MetricRow, Panel,
  Table, TBody, TD, TH, THead, TR, TableScroll, TableEmpty, Avatar, Section,
} from "@/components/ui";
import { PageHeader } from "@/components/AppShell";

export const metadata = { title: "Painel geral" };

/* =========================================================================
   PAINEL ADMINISTRATIVO
   -------------------------------------------------------------------------
   Continua sendo a visão consolidada da carteira, mas agora ORDENADA POR
   PRESSÃO: o ministério com mais demandas atrasadas vem primeiro. A versão
   anterior listava em ordem alfabética, o que faz a tabela parecer um
   cadastro quando ela deveria ser um radar — quem abre esta tela quer
   saber onde apagar incêndio, não quem começa com A.

   Cada linha leva pro ministério (troca o contexto ativo e abre o painel
   dele), o que antes exigia usar o seletor no menu.
   ========================================================================= */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !isComunicacaoGlobal(user)) {
    redirect("/dashboard");
  }

  const [overview, allCampaigns, universo, ministerios] = await Promise.all([
    getAdminOverview(),
    getAllCampaignsAdmin(),
    getUniversoComparacao(),
    getAllMinistries(),
  ]);

  // Janela dos últimos 12 meses, comparada com os 12 anteriores. Fixa e
  // explícita na tela — "variação" sem dizer contra o quê não significa
  // nada.
  const fimJanela = hoje();
  const inicioJanela = somaDias(fimJanela, -364);
  const carteira = resumirCarteira(universo, { inicio: inicioJanela, fim: fimJanela });
  const nomePorMinisterio = new Map(ministerios.map((m) => [m.id, m.name] as const));

  const pendingCampaigns = allCampaigns.filter((c) => !c.publicada);
  const totalDemandas = overview.reduce((s, m) => s + m.demandasAtivas, 0);
  const totalAtrasadas = overview.reduce((s, m) => s + m.demandasAtrasadas, 0);
  const totalCampanhas = overview.reduce((s, m) => s + m.campanhasAtivas, 0);
  const totalRisco = overview.reduce((s, m) => s + m.campanhasEmAtencaoOuCritica, 0);

  // Ordem por pressão: atrasadas, depois campanhas em risco, depois volume.
  const ordered = [...overview].sort(
    (a, b) =>
      b.demandasAtrasadas - a.demandasAtrasadas ||
      b.campanhasEmAtencaoOuCritica - a.campanhasEmAtencaoOuCritica ||
      b.demandasAtivas - a.demandasAtivas ||
      a.name.localeCompare(b.name, "pt-BR")
  );

  const comAtraso = ordered.filter((m) => m.demandasAtrasadas > 0).length;

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Painel geral"
        description="Visão consolidada de todos os ministérios atendidos pela Comunicação, ordenada por pressão."
        actions={
          <Link href="/dashboard/admin/campanhas-pendentes">
            <Button variant="secondary" iconLeft={<Icon.Layers className="h-4 w-4" />}>
              Campanhas
            </Button>
          </Link>
        }
      />

      {pendingCampaigns.length > 0 && (
        <Alert
          tone="accent"
          title={`${pendingCampaigns.length} ${pendingCampaigns.length === 1 ? "campanha oculta" : "campanhas ocultas"}`}
          className="mb-5"
          action={
            <Link href="/dashboard/admin/campanhas-pendentes">
              <Button variant="secondary" size="sm" iconRight={<Icon.ArrowRight className="h-3.5 w-3.5" />}>
                Revisar
              </Button>
            </Link>
          }
        >
          {pendingCampaigns.length === 1
            ? "O ministério ainda não consegue ver essa campanha."
            : "Os ministérios ainda não conseguem ver essas campanhas."}
        </Alert>
      )}

      <MetricRow columns={4} className="mb-6">
        <Metric
          label="Demandas ativas"
          value={totalDemandas}
          hint={`em ${overview.length} ${overview.length === 1 ? "ministério" : "ministérios"}`}
          icon={<Icon.ListChecks className="h-4 w-4" />}
        />
        <Metric
          label="Demandas atrasadas"
          value={totalAtrasadas}
          hint={comAtraso > 0 ? `concentradas em ${comAtraso} ${comAtraso === 1 ? "ministério" : "ministérios"}` : "nenhum atraso"}
          icon={<Icon.AlertTriangle className="h-4 w-4" />}
        />
        <Metric
          label="Campanhas ativas"
          value={totalCampanhas}
          icon={<Icon.Megaphone className="h-4 w-4" />}
        />
        <Metric
          label="Campanhas em risco"
          value={totalRisco}
          hint="em atenção ou crítica"
          icon={<Icon.Activity className="h-4 w-4" />}
        />
      </MetricRow>

      {/* ---------- Inteligência da carteira ---------- */}
      {carteira.eventos > 0 && (
        <Section
          eyebrow="Carteira"
          title="Últimos 12 meses"
          description="Consolidado dos eventos publicados no período, comparado com os 12 meses anteriores."
          className="mb-6"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <Metric
                label="Investido no período"
                value={formatMoney(carteira.investimento, true)}
                icon={<Icon.Wallet className="h-4 w-4" />}
                footer={
                  <VariacaoBadge valor={carteira.variacaoInvestimento} rotulo="vs. período anterior" />
                }
              />
              <Metric
                label="Resultados no período"
                value={carteira.resultados != null ? formatCompact(carteira.resultados) : "—"}
                hint={
                  carteira.resultados == null
                    ? "nenhuma campanha com conversão rastreada"
                    : `${carteira.eventos} ${carteira.eventos === 1 ? "evento" : "eventos"} em ${carteira.ministerios} ${carteira.ministerios === 1 ? "ministério" : "ministérios"}`
                }
                icon={<Icon.Target className="h-4 w-4" />}
                footer={
                  carteira.resultados != null ? (
                    <VariacaoBadge valor={carteira.variacaoResultados} rotulo="vs. período anterior" />
                  ) : undefined
                }
              />
            </div>

            <Panel
              title="Eficiência por ministério"
              description="Custo por resultado mediano"
              className="lg:col-span-2"
            >
              <RankingEficiencia ranking={carteira.ranking} nomePorMinisterio={nomePorMinisterio} />
            </Panel>
          </div>
        </Section>
      )}

      <Panel title="Ministérios" description="Do mais pressionado para o mais tranquilo" noPadding>
        {overview.length === 0 ? (
          <div className="p-5">
            <EmptyState
              size="sm"
              icon={<Icon.Building className="h-4 w-4" />}
              title="Nenhum ministério cadastrado"
              description="Cadastre o primeiro ministério para começar a acompanhar a carteira."
              action={
                <Link href="/dashboard/admin/ministerios">
                  <Button variant="primary" iconLeft={<Icon.Plus className="h-4 w-4" />}>
                    Cadastrar ministério
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <TableScroll>
            <Table>
              <THead>
                <TR>
                  <TH>Ministério</TH>
                  <TH numeric>Ativas</TH>
                  <TH numeric>Atrasadas</TH>
                  <TH numeric className="hidden sm:table-cell">Campanhas</TH>
                  <TH numeric className="hidden sm:table-cell">Em risco</TH>
                </TR>
              </THead>
              <TBody>
                {ordered.length === 0 ? (
                  <TableEmpty colSpan={5}>Nenhum ministério cadastrado ainda.</TableEmpty>
                ) : (
                  ordered.map((m) => (
                    <TR key={m.id} interactive>
                      <TD strong>
                        <Link href={`/dashboard/admin/ministerios/${m.id}`} className="flex items-center gap-2.5 hover:text-brand-600">
                          <Avatar name={m.name} size="xs" />
                          <span className="truncate">{m.name}</span>
                        </Link>
                      </TD>
                      <TD numeric>{m.demandasAtivas}</TD>
                      <TD numeric>
                        {m.demandasAtrasadas > 0 ? (
                          <Badge tone="danger" size="sm">
                            {m.demandasAtrasadas}
                          </Badge>
                        ) : (
                          <span className="text-ink-3">0</span>
                        )}
                      </TD>
                      <TD numeric className="hidden sm:table-cell">
                        {m.campanhasAtivas}
                      </TD>
                      <TD numeric className="hidden sm:table-cell">
                        {m.campanhasEmAtencaoOuCritica > 0 ? (
                          <Badge tone="warning" size="sm">
                            {m.campanhasEmAtencaoOuCritica}
                          </Badge>
                        ) : (
                          <span className="text-ink-3">0</span>
                        )}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </TableScroll>
        )}
      </Panel>
    </div>
  );
}
