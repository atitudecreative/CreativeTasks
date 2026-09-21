import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireComunicacao, getMinistryById } from "@/lib/data/ministries";
import { getSiteTheme } from "@/lib/data/theme";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Breadcrumb, Icon, Panel, Section } from "@/components/ui";
import { PageHeader } from "@/components/AppShell";
import { EditMinistryForm } from "../EditMinistryForm";
import { DeleteMinistryButton } from "../DeleteMinistryButton";
import { CapaUploadForm } from "../CapaUploadForm";
import { MinistryThemeForm } from "../MinistryThemeForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ministry = await getMinistryById(id);
  return { title: ministry ? `Editar ${ministry.name}` : "Editar ministério" };
}

export default async function EditMinistryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireComunicacao();
  const { id } = await params;
  const [ministry, siteTheme] = await Promise.all([getMinistryById(id), getSiteTheme()]);
  if (!ministry) notFound();

  const supabase = await createClient();
  const [{ count: memberCount }, { count: demandCount }] = await Promise.all([
    supabase.from("ministry_members").select("*", { count: "exact", head: true }).eq("ministry_id", id),
    supabase.from("demands").select("*", { count: "exact", head: true }).eq("ministry_id", id),
  ]);

  return (
    <div className="mx-auto max-w-report">
      <Breadcrumb
        items={[{ label: "Ministérios", href: "/dashboard/admin/ministerios" }, { label: ministry.name }]}
        className="mb-3"
      />

      <PageHeader
        eyebrow="Administração"
        title={ministry.name}
        description="Dados cadastrais, identidade visual e acesso deste ministério."
        meta={
          <>
            <Badge tone="neutral" icon={<Icon.Users className="h-3 w-3" />}>
              {memberCount ?? 0} {memberCount === 1 ? "usuário" : "usuários"}
            </Badge>
            <Badge tone="neutral" icon={<Icon.ListChecks className="h-3 w-3" />}>
              {demandCount ?? 0} {demandCount === 1 ? "demanda" : "demandas"}
            </Badge>
          </>
        }
      />

      <div className="space-y-section">
        <Section eyebrow="Cadastro" title="Dados do ministério">
          <EditMinistryForm ministry={ministry} />
        </Section>

        <Section
          eyebrow="Identidade"
          title="Capa e cores"
          description="A capa aparece como fundo do menu lateral; as cores repintam o portal inteiro para quem acessa este ministério."
        >
          <div className="space-y-4">
            <CapaUploadForm ministryId={ministry.id} ministryName={ministry.name} currentCapaUrl={ministry.capa_url} />
            <MinistryThemeForm
              ministryId={ministry.id}
              initialBrand={ministry.brand_color ?? siteTheme.brandColor}
              initialWalnut={ministry.walnut_color ?? siteTheme.walnutColor}
              siteBrand={siteTheme.brandColor}
              siteWalnut={siteTheme.walnutColor}
              hasCustom={Boolean(ministry.brand_color || ministry.walnut_color)}
            />
          </div>
        </Section>

        <Section eyebrow="Zona de risco" title="Excluir ministério">
          <Panel className="border-danger-line">
            <Alert tone="danger" title="Esta ação é irreversível" className="mb-4">
              Excluir apaga este ministério e tudo ligado a ele: vínculos de usuário, demandas, campanhas,
              entregas e a fonte de dados do Asana.
            </Alert>
            <DeleteMinistryButton
              id={ministry.id}
              name={ministry.name}
              memberCount={memberCount ?? 0}
              demandCount={demandCount ?? 0}
              variant="full"
            />
          </Panel>
        </Section>
      </div>
    </div>
  );
}
