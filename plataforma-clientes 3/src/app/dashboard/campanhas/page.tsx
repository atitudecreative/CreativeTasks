import { requireMinistry } from "@/lib/data/ministries";
import { getCampaignsForMinistry, FASE_LABEL, SAUDE_LABEL, TIPO_LABEL } from "@/lib/data/campaigns";
import { formatMoney } from "@/lib/metricLanguage";
import { Badge, EmptyState, Icon } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { CampanhasExplorer } from "./CampanhasExplorer";

export const metadata = { title: "Campanhas e eventos" };

export default async function CampanhasPage() {
  const { ministry } = await requireMinistry();
  const campaigns = await getCampaignsForMinistry(ministry.id);

  const emRisco = campaigns.filter((c) => c.saude === "atencao" || c.saude === "critica").length;
  const investido = campaigns.reduce((sum, c) => sum + (c.investimento_realizado ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Campanhas e eventos"
        description={`Cada iniciativa da Comunicação para ${ministry.name}, com o que foi investido, produzido e entregue.`}
        meta={
          campaigns.length > 0 ? (
            <>
              <Badge tone="neutral">
                {campaigns.length} {campaigns.length === 1 ? "campanha" : "campanhas"}
              </Badge>
              {emRisco > 0 && (
                <Badge tone="warning" icon={<Icon.AlertTriangle className="h-3 w-3" />}>
                  {emRisco} exigindo atenção
                </Badge>
              )}
              {investido > 0 && (
                <Badge tone="neutral" icon={<Icon.Wallet className="h-3 w-3" />}>
                  {formatMoney(investido, true)} investidos
                </Badge>
              )}
            </>
          ) : undefined
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Icon.Megaphone className="h-5 w-5" />}
          title="Nenhuma campanha publicada ainda"
          description="Quando a Comunicação publicar uma campanha ou evento deste ministério, o relatório completo aparece aqui."
        />
      ) : (
        <CampanhasExplorer
          campaigns={campaigns.map((c) => ({
            id: c.id,
            nome: c.nome,
            identificador: c.identificador,
            tipo: c.tipo,
            tipoLabel: TIPO_LABEL[c.tipo] ?? c.tipo,
            fase: c.fase,
            faseLabel: FASE_LABEL[c.fase] ?? c.fase,
            saude: c.saude,
            saudeLabel: SAUDE_LABEL[c.saude] ?? c.saude,
            capaUrl: c.capa_url,
            dataInicio: c.data_inicio,
            dataTermino: c.data_termino,
            dataEvento: c.data_evento,
            orcamentoAprovado: c.orcamento_aprovado,
            investimentoRealizado: c.investimento_realizado,
          }))}
        />
      )}
    </div>
  );
}
