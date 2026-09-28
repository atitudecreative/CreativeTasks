"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Alert, Button, Input, Select, Textarea, useToast } from "@/components/ui";
import { updateMinistry } from "./actions";
import { CATEGORIA_OPTIONS, MINISTRY_STATUS_OPTIONS } from "@/lib/ministryOptions";

// Tipo só com o que o form precisa — evita importar o tipo MinistryDetail
// (que vem de um arquivo que puxa o cliente Supabase de servidor) num
// Client Component.
type EditableMinistry = {
  id: string;
  name: string;
  sigla: string | null;
  categoria: string;
  status: string;
  description: string | null;
  pastor_responsavel: string | null;
  ponto_focal_ministerio: string | null;
  ponto_focal_comunicacao: string | null;
  centro_custo: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending}>
      {pending ? "Salvando..." : "Salvar alterações"}
    </Button>
  );
}

/* Mesmos campos, nos componentes do design system, em dois grupos com
   nome — quem é o ministério, e quem responde por ele. A confirmação só
   aparece depois que o banco responde (antes não havia confirmação
   nenhuma: o botão voltava a "Salvar" e a pessoa não sabia se tinha
   salvado). */
export function EditMinistryForm({ ministry }: { ministry: EditableMinistry }) {
  const [state, formAction] = useFormState(updateMinistry, { error: null as string | null });
  const toast = useToast();
  const enviou = useRef(false);

  useEffect(() => {
    if (!enviou.current) return;
    enviou.current = false;
    if (!state?.error) toast.success("Ministério atualizado.");
  }, [state, toast]);

  return (
    <form
      action={formAction}
      onSubmit={() => (enviou.current = true)}
      className="space-y-6 rounded-panel border border-line bg-surface p-5 shadow-xs"
    >
      <input type="hidden" name="id" value={ministry.id} />

      <div>
        <p className="mb-3 font-mono text-label uppercase text-ink-3">Identificação</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input name="name" label="Nome" required defaultValue={ministry.name} />
          <Input name="sigla" label="Sigla" defaultValue={ministry.sigla ?? ""} hint="Aparece no avatar do ministério." />
          <Select name="categoria" label="Categoria" defaultValue={ministry.categoria}>
            {CATEGORIA_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select name="status" label="Status" defaultValue={ministry.status}>
            {MINISTRY_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Textarea
            name="description"
            label="Descrição"
            rows={3}
            defaultValue={ministry.description ?? ""}
            containerClassName="sm:col-span-2"
          />
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <p className="mb-3 font-mono text-label uppercase text-ink-3">Responsáveis</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input name="pastorResponsavel" label="Pastor responsável" defaultValue={ministry.pastor_responsavel ?? ""} />
          <Input name="centroCusto" label="Centro de custo" defaultValue={ministry.centro_custo ?? ""} />
          <Input
            name="pontoFocalMinisterio"
            label="Ponto focal do ministério"
            defaultValue={ministry.ponto_focal_ministerio ?? ""}
          />
          <Input
            name="pontoFocalComunicacao"
            label="Ponto focal da Comunicação"
            defaultValue={ministry.ponto_focal_comunicacao ?? ""}
          />
        </div>
      </div>

      {state?.error && (
        <Alert tone="danger" title="Não foi possível salvar">
          {state.error}
        </Alert>
      )}

      <div className="flex justify-end border-t border-line pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
