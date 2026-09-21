"use client";

import { useRef, useState, useTransition } from "react";
import { createDeliverable } from "./actions";
import { DELIVERABLE_STATUS_LABEL } from "@/lib/deliverableOptions";
import { Alert, Button, Icon, Input, Modal, Select, Textarea, useToast } from "@/components/ui";

/* =========================================================================
   NOVA ENTREGA
   -------------------------------------------------------------------------
   Era um formulário que se abria empurrando a lista inteira pra baixo —
   em telas pequenas a pessoa perdia o contexto do que já existia. Virou
   um diálogo, que é onde a criação de um registro pertence: foco preso,
   Esc fecha, rolagem de fundo travada, e a lista continua atrás.

   Os campos e os nomes (`name=`) são exatamente os mesmos, então o server
   action `createDeliverable` não mudou uma linha.
   ========================================================================= */
export function NewDeliverableForm({
  ministryId,
  campaigns,
}: {
  ministryId: string;
  campaigns: { id: string; nome: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createDeliverable(ministryId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setOpen(false);
        toast.success({
          title: "Entrega registrada",
          description: `"${String(formData.get("titulo") ?? "")}" já aparece na biblioteca.`,
        });
      }
    });
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} iconLeft={<Icon.Plus className="h-4 w-4" />}>
        Nova entrega
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova entrega"
        description="Toda entrega é um link — nada fica hospedado no portal."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="form-nova-entrega" loading={isPending}>
              Salvar entrega
            </Button>
          </>
        }
      >
        <form id="form-nova-entrega" ref={formRef} action={handleSubmit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}

          <Input name="titulo" label="Título" required placeholder="ex: Card de divulgação — feed" />

          <Input
            name="link_principal"
            type="url"
            label="Link principal"
            required
            placeholder="https://drive.google.com/..."
            hint="Drive, YouTube, Figma ou qualquer link público."
            iconLeft={<Icon.Link className="h-4 w-4" />}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input name="tipo_arquivo" label="Tipo de arquivo" placeholder="vídeo, carrossel, PDF..." />
            <Input name="versao" label="Versão" placeholder="1, v2-final..." />
            <Select name="campaign_id" label="Campanha ou evento" hint="Opcional — vincula a entrega ao relatório.">
              <option value="">Nenhuma</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
            <Select name="status" label="Status inicial" defaultValue="para_aprovacao">
              {Object.entries(DELIVERABLE_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            name="links_complementares"
            label="Links complementares"
            rows={3}
            hint="Um por linha. Opcional."
            placeholder={"https://...\nhttps://..."}
          />
        </form>
      </Modal>
    </>
  );
}
