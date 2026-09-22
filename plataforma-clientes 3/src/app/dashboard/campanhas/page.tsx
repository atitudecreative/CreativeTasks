import { requireMinistry } from "@/lib/data/ministries";
import { getCampaignsForMinistry, FASE_LABEL, SAUDE_LABEL, TIPO_LABEL } from "@/lib/data/campaigns";
import { getUniversoComparacao } from "@/lib/data/campanhaPerfil";
import { hoje } from "@/lib/dates";
import { EmptyState, Icon } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { CampanhasExplorer } from "./CampanhasExplorer";

export const metadata = { title: "Campanhas e eventos" };

export default async function CampanhasPage() {
  const { ministry } = await requireMinistry();

  // O perfil consolidado (view campanha_perfil) entra aqui pela primeira
  // vez. A lista mostrava só nome, saúde, fase e orçamento — três campos de
  // cadastro — enquanto demandas, entregas, progresso de marcos e gasto de
  // mídia já existiam no banco e não apareciam em lugar nenhum antes de
  // abrir uma campanha. É dado real que estava parado.
  const [campaigns, universoCarga] = await Promise.all([
    getCampaignsForMinistry(ministry.id),
    getUniversoComparacao(),
  ]);

  const perfilPorId = new Map(
    (universoCarga.ok ? universoCarga.dados : []).map((p) => [p.id, p])
  );

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Campanhas e eventos"
        description={`Cada iniciativa da Comunicação para ${ministry.name}, com o que foi investido, produzido e entregue.`}
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Icon.Megaphone className="h-5 w-5" />}
          title="Nenhuma campanha publicada ainda"
          description="Quando a Comunicação publicar uma campanha ou evento deste ministério, o relatório completo aparece aqui."
        />
      ) : (
        <CampanhasExplorer
          hoje={hoje()}
          campaigns={campaigns.map((c) => {
            const p = perfilPorId.get(c.id);
            return {
              id: c.id,
              nome: c.nome,
              identificador: c.identificador,
              tipo: c.tipo,
              tipoLabel: TIPO_LABEL[c.tipo] ?? c.tipo,
              fase: c.fase,
              faseLabel: FASE_LABEL[c.fase] ?? c.fase,
              saude: c.saude,
              saudeLabel: SAUDE_LABEL[c.saude] ?? c.saude,
              dataInicio: c.data_inicio,
              dataTermino: c.data_termino,
              dataEvento: c.data_evento,
              orcamentoAprovado: c.orcamento_aprovado,
              // Mesma regra do relatório e do Início: mídia sincronizada
              // quando existe, senão o lançamento manual.
              investimento: p?.investimento ?? c.investimento_realizado,
              demandasTotal: p?.demandasTotal ?? null,
              demandasConcluidas: p?.demandasConcluidas ?? null,
              entregasTotal: p?.entregasTotal ?? null,
              progressoMarcos: p?.progressoMarcos ?? null,
              alcance: p?.alcance ?? null,
            };
          })}
        />
      )}
    </div>
  );
}
