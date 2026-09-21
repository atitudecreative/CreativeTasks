"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMinistry } from "./actions";
import { CATEGORIA_OPTIONS } from "@/lib/ministryOptions";
import { Alert, Button, Input, Select } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending}>
      {pending ? "Criando..." : "Criar ministério"}
    </Button>
  );
}

export function CreateMinistryForm({ onCancel }: { onCancel?: () => void }) {
  const [state, formAction] = useFormState(createMinistry, { error: null as string | null });

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input name="name" label="Nome" required autoFocus containerClassName="sm:col-span-2" />
        <Input name="sigla" label="Sigla" hint="Opcional — aparece nas listagens." />
        <Select name="categoria" label="Categoria" defaultValue="ministerio">
          {CATEGORIA_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Input name="pastorResponsavel" label="Pastor responsável" />
        <Input name="pontoFocalMinisterio" label="Ponto focal do ministério" />
        <Input
          name="pontoFocalComunicacao"
          label="Ponto focal da Comunicação"
          containerClassName="sm:col-span-2"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton />
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
