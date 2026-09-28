"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateCampaignDetails,
  uploadCampaignCapa,
  removeCampaignCapa,
  setCampaignMinistryVisibility,
} from "../actions";
import { TIPO_OPTIONS, FASE_OPTIONS, SAUDE_OPTIONS } from "@/lib/campaignOptions";
import type { Campaign } from "@/lib/data/campaigns";
import type { Ministry } from "@/lib/data/ministries";
import { Alert, Button, Checkbox, Icon, Input, Panel, Select, Textarea, useToast } from "@/components/ui";

/* =========================================================================
   EDITAR CAMPANHA
   -------------------------------------------------------------------------
   Três mudanças de produto, além de trocar os campos crus pelos do design
   system:

   1. ORDEM. A tela abria com a capa e a visibilidade, e o que se vem
      editar quase sempre — nome, datas, orçamento — ficava no fim, depois
      de dois blocos de rolagem. Agora: informações, visibilidade, capa.
   2. GRUPOS. Treze campos numa grade só viraram quatro grupos com nome
      (identificação, período, orçamento, o que o ministério lê). O
      orçamento avisa que o gasto de mídia sincronizado prevalece sobre o
      lançado à mão — sem isso, alguém corrige o valor aqui e não entende
      por que o relatório não mudou.
   3. RETORNO. "Salvo." aparecia no instante do clique, antes de o banco
      responder, e continuava lá se a gravação falhasse. Remover a capa não
      dava sinal nenhum. Toda gravação agora confirma depois de terminar, e
      a falha vira frase.
   ========================================================================= */

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

function Grupo({
  titulo,
  descricao,
  colunas = 2,
  children,
}: {
  titulo: string;
  descricao?: string;
  colunas?: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 border-t border-line pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="float-left mb-3 w-full">
        <span className="block font-mono text-label uppercase text-ink-3">{titulo}</span>
        {descricao && <span className="mt-1 block text-caption text-ink-3">{descricao}</span>}
      </legend>
      <div className={`clear-both grid grid-cols-1 gap-4 sm:grid-cols-2 ${colunas === 3 ? "lg:grid-cols-3" : ""}`}>
        {children}
      </div>
    </fieldset>
  );
}

function InfoForm({ campaign }: { campaign: Campaign }) {
  const [state, formAction] = useFormState(updateCampaignDetails, { error: null as string | null });
  const toast = useToast();
  const enviou = useRef(false);

  // useFormState devolve um objeto novo a cada envio concluído — é o sinal
  // de que o banco respondeu. Só então se confirma.
  useEffect(() => {
    if (!enviou.current) return;
    enviou.current = false;
    if (!state.error) toast.success("Alterações salvas.");
  }, [state, toast]);

  return (
    <Panel title="Informações da campanha" description="O que o ministério vê no relatório deste evento">
      <form action={formAction} onSubmit={() => (enviou.current = true)} className="space-y-6">
        <input type="hidden" name="id" value={campaign.id} />

        <Grupo titulo="Identificação">
          <Input name="nome" label="Nome" defaultValue={campaign.nome} required containerClassName="sm:col-span-2" />
          <Select name="tipo" label="Tipo" defaultValue={campaign.tipo}>
            {TIPO_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select name="fase" label="Fase" defaultValue={campaign.fase}>
            {FASE_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          <Select
            name="saude"
            label="Saúde"
            hint="Atenção e Crítica colocam a campanha no quadro de risco do ministério e do painel geral."
            defaultValue={campaign.saude}
            containerClassName="sm:col-span-2"
          >
            {SAUDE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Grupo>

        <Grupo titulo="Período" colunas={3} descricao="A data do evento é a que posiciona a campanha nos resultados por período do Início.">
          <Input type="date" name="data_inicio" label="Início" defaultValue={campaign.data_inicio ?? ""} />
          <Input type="date" name="data_termino" label="Término" defaultValue={campaign.data_termino ?? ""} />
          <Input type="date" name="data_evento" label="Data do evento" defaultValue={campaign.data_evento ?? ""} />
        </Grupo>

        <Grupo
          titulo="Orçamento"
          colunas={3}
          descricao="Se houver campanha do Meta Ads vinculada, o relatório usa o gasto sincronizado de lá e ignora o investimento lançado aqui."
        >
          <Input
            name="orcamento_planejado"
            label="Planejado (R$)"
            inputMode="decimal"
            placeholder="ex.: 12.500,00"
            defaultValue={campaign.orcamento_planejado ?? ""}
          />
          <Input
            name="orcamento_aprovado"
            label="Aprovado (R$)"
            inputMode="decimal"
            placeholder="ex.: 12.500,00"
            defaultValue={campaign.orcamento_aprovado ?? ""}
          />
          <Input
            name="investimento_realizado"
            label="Investimento realizado (R$)"
            inputMode="decimal"
            placeholder="ex.: 12.500,00"
            defaultValue={campaign.investimento_realizado ?? ""}
          />
        </Grupo>

        <Grupo titulo="O que o ministério lê" descricao="Textos exibidos no relatório do evento.">
          <Textarea
            name="objetivo_estrategico"
            label="Objetivo estratégico"
            rows={2}
            defaultValue={campaign.objetivo_estrategico ?? ""}
            containerClassName="sm:col-span-2"
          />
          <Textarea
            name="escopo_macro"
            label="Escopo macro"
            rows={2}
            defaultValue={campaign.escopo_macro ?? ""}
            containerClassName="sm:col-span-2"
          />
          <Textarea
            name="resultados_observacoes"
            label="Leitura dos resultados"
            hint="Aparece no relatório como “Leitura da Comunicação”, logo abaixo dos números."
            rows={3}
            defaultValue={campaign.resultados_observacoes ?? ""}
            containerClassName="sm:col-span-2"
          />
        </Grupo>

        {state.error && (
          <Alert tone="danger" title="Não foi possível salvar">
            {state.error}
          </Alert>
        )}

        <div className="flex justify-end border-t border-line pt-4">
          <SaveButton label="Salvar alterações" />
        </div>
      </form>
    </Panel>
  );
}

// Escolha manual de quais ministérios veem essa campanha, além dos que
// já enxergam automaticamente por terem demanda vinculada (migration
// 0026). Soma à regra automática — desmarcar aqui não tira o acesso de
// quem já tem demanda ali, só cancela uma liberação manual anterior.
function VisibilityBlock({
  campaign,
  ministries,
  manualMinistryIds,
}: {
  campaign: Campaign;
  ministries: Ministry[];
  manualMinistryIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(manualMinistryIds));
  const [pendente, iniciar] = useTransition();
  const toast = useToast();
  const alterado =
    selected.size !== manualMinistryIds.length || manualMinistryIds.some((id) => !selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Panel
      title="Liberação para outros ministérios"
      description="Quem tem demanda nesta campanha já a vê. Marque quem mais deve ver, mesmo sem demanda própria."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("campaignId", campaign.id);
          selected.forEach((id) => fd.append("ministryId", id));
          iniciar(async () => {
            try {
              await setCampaignMinistryVisibility(fd);
              toast.success("Liberação salva.");
            } catch {
              toast.error("Não foi possível salvar a liberação. Tente de novo.");
            }
          });
        }}
      >
        {!campaign.publicada && (
          <Alert tone="warning" className="mb-4">
            Esta campanha está oculta. A liberação só passa a valer quando ela for publicada.
          </Alert>
        )}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ministries.map((m) => (
            <Checkbox
              key={m.id}
              label={m.name}
              checked={selected.has(m.id)}
              onChange={() => toggle(m.id)}
            />
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant={alterado ? "primary" : "secondary"} loading={pendente} disabled={!alterado}>
            Salvar liberação
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function CapaBlock({ campaign }: { campaign: Campaign }) {
  const [state, formAction] = useFormState(uploadCampaignCapa, { error: null as string | null });
  const [preview, setPreview] = useState<string | null>(null);
  const [removendo, iniciar] = useTransition();
  const toast = useToast();
  const enviou = useRef(false);

  useEffect(() => {
    if (!enviou.current) return;
    enviou.current = false;
    if (!state.error) {
      toast.success("Capa atualizada.");
      setPreview(null);
    }
  }, [state, toast]);

  const imagem = preview ?? campaign.capa_url;

  return (
    <Panel title="Capa" description="Banner no topo do relatório do evento, para os ministérios envolvidos">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div
          className="relative flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-card border border-line bg-walnut-900 bg-cover bg-center"
          style={imagem ? { backgroundImage: `url(${imagem})` } : undefined}
        >
          {!imagem && (
            <span className="flex flex-col items-center gap-1.5 text-caption text-walnut-300">
              <Icon.Image className="h-5 w-5" />
              Sem capa — o relatório abre só com o cabeçalho de texto
            </span>
          )}
          {preview && (
            <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[0.6875rem] font-medium text-white">
              Prévia — ainda não enviada
            </span>
          )}
        </div>

        <form action={formAction} onSubmit={() => (enviou.current = true)} className="space-y-3">
          <input type="hidden" name="campaignId" value={campaign.id} />
          <label className="block">
            <span className="mb-1.5 block text-caption font-medium text-ink-2">Nova imagem</span>
            <input
              type="file"
              name="capa"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
              className="block w-full text-small text-ink-2 file:mr-3 file:h-control-sm file:cursor-pointer file:rounded-control file:border file:border-line-strong file:bg-surface file:px-3 file:text-caption file:font-medium file:text-ink hover:file:bg-surface-sunken"
            />
            <span className="mt-1 block text-caption text-ink-3">PNG, JPG ou WEBP, até 4 MB. Proporção larga funciona melhor.</span>
          </label>
          {state.error && (
            <Alert tone="danger" title="A capa não foi enviada">
              {state.error}
            </Alert>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <SaveButton label="Enviar capa" />
            {campaign.capa_url && (
              <Button
                type="button"
                variant="ghost"
                loading={removendo}
                className="text-danger"
                onClick={() => {
                  if (!window.confirm(`Remover a capa de "${campaign.nome}"?`)) return;
                  const fd = new FormData();
                  fd.set("campaignId", campaign.id);
                  iniciar(async () => {
                    try {
                      await removeCampaignCapa(fd);
                      toast.success("Capa removida.");
                    } catch {
                      toast.error("Não foi possível remover a capa. Tente de novo.");
                    }
                  });
                }}
              >
                Remover capa
              </Button>
            )}
          </div>
        </form>
      </div>
    </Panel>
  );
}

export function EditCampaignForm({
  campaign,
  ministries,
  manualMinistryIds,
}: {
  campaign: Campaign;
  ministries: Ministry[];
  manualMinistryIds: string[];
}) {
  return (
    <div className="space-y-5">
      <InfoForm campaign={campaign} />
      <VisibilityBlock campaign={campaign} ministries={ministries} manualMinistryIds={manualMinistryIds} />
      <CapaBlock campaign={campaign} />
    </div>
  );
}
