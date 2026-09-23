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
  Alert, Badge, Button, EmptyState, Icon, PageBody, Panel, RailBlock, RailStat,
  Table, TBody, TD, TH, THead, TR, TableScroll, TableEmpty, Avatar,
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

   O QUE MUDOU NESTA PASSAGEM
   Os quatro números do topo eram quatro cartões com borda, lado a lado —
   um painel de aeroporto. Eles não são o conteúdo desta tela: o conteúdo é
   a LISTA DE MINISTÉRIOS, que é por onde a Comunicação trabalha. Os
   números foram para o trilho, junto com o consolidado de 12 meses, na
   mesma linguagem que Demandas e Campanhas já usam: rótulo em versalete,
   número grande, sem caixa.

   E a régua de eficiência deixou de ocupar 250px de caixa tracejada para
   dizer que ainda não há o que ranquear.
   ========================================================================= */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !isComunicacaoGlobal(user)) {
    redirect("/dashboard");
  }

  const [overview, allCampaigns, universoCarga, ministerios] = await Promise.all([
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
  // Ver a nota em getUniversoComparacao: a base de comparação degrada em
  // vez de derrubar a tela, mas nunca em silêncio.
  const universo = universoCarga.ok ? universoCarga.dados : [];
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

  const trilho = (
    <>
      <RailBlock label="Carteira hoje">
        <div className="divide-y divide-line">
          <RailStat
            label="Demandas ativas"
            value={totalDemandas}
            hint={`em ${overview.length} ${overview.length === 1 ? "ministério" : "ministérios"}`}
          />
          <RailStat
            label="Demandas atrasadas"
            value={totalAtrasadas}
            tone={totalAtrasadas > 0 ? "danger" : "default"}
            hint={
              comAtraso > 0
                ? `concentradas em ${comAtraso} ${comAtraso === 1 ? "ministério" : "ministérios"}`
                : "nenhum atraso"
            }
          />
          <RailStat label="Campanhas ativas" value={totalCampanhas} />
          <RailStat
            label="Campanhas em risco"
            value={totalRisco}
            tone={totalRisco > 0 ? "warning" : "default"}
            hint="em atenção ou crítica"
          />
        </div>
      </RailBlock>

      {universoCarga.ok && carteira.eventos > 0 && (
        <RailBlock label="Últimos 12 meses">
          <div className="divide-y divide-line">
            <div className="py-1.5">
              <RailStat label="Investido no período" value={formatMoney(carteira.investimento, true)} />
              <VariacaoBadge valor={carteira.variacaoInvestimento} rotulo="vs. período anterior" />
            </div>
            <div className="py-1.5">
              <RailStat
                label="Resultados no período"
                value={carteira.resultados != null ? formatCompact(carteira.resultados) : "—"}
                hint={
                  carteira.resultados == null
                    ? "nenhuma campanha com conversão rastreada"
                    : `${carteira.eventos} ${carteira.eventos === 1 ? "evento" : "eventos"} em ${carteira.ministerios} ${carteira.ministerios === 1 ? "ministério" : "ministérios"}`
                }
              />
              {carteira.resultados != null && (
                <VariacaoBadge valor={carteira.variacaoResultados} rotulo="vs. período anterior" />
              )}
            </div>
          </div>
          <p className="mt-2 text-caption leading-relaxed text-ink-3">
            Consolidado dos eventos publicados no período, comparado com os 12 meses anteriores.
          </p>
        </RailBlock>
      )}
    </>
  );

  return (
    <div className="min-w-0">
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

      {!universoCarga.ok && (
        <Alert tone="warning" className="mb-5" title="Carteira indisponível agora">
          Não foi possível carregar os números consolidados dos eventos. O resto do painel está
          correto — só a seção de carteira ficou de fora. Atualize a página; se continuar, avise a
          equipe técnica.
        </Alert>
      )}

      {/* railFirstOnMobile: no celular os totais vêm antes da tabela. Eles
          são o resumo; a tabela é o detalhe, e detalhe não vem primeiro. */}
      <PageBody rail={trilho} railFirstOnMobile>
        <div className="space-y-5">
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
                            <Link
                              href={`/dashboard/admin/ministerios/${m.id}`}
                              className="flex items-center gap-2.5 hover:text-brand-600"
                            >
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

          {/* A régua só entra quando há o que ordenar. Sem dado, uma linha
              explicando quando ela aparece — não uma caixa tracejada da
              altura de um gráfico para anunciar uma ausência. */}
          {universoCarga.ok && carteira.eventos > 0 && (
            <Panel
              title="Eficiência por ministério"
              description={carteira.ranking.length > 0 ? "Custo por resultado mediano" : undefined}
            >
              {carteira.ranking.length > 0 ? (
                <RankingEficiencia ranking={carteira.ranking} nomePorMinisterio={nomePorMinisterio} />
              ) : (
                <p className="text-small leading-relaxed text-ink-2">
                  Ainda não há custo por resultado calculável. A régua aparece quando houver
                  campanha com investimento e conversão rastreada — os dois, no mesmo evento.
                </p>
              )}
            </Panel>
          )}
        </div>
      </PageBody>
    </div>
  );
}
