"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createUser } from "./actions";
import { Alert, Button, Icon, Input, Modal, Select } from "@/components/ui";

const PAPEL_GLOBAL_OPTIONS = [
  { value: "nenhum", label: "Nenhum — só o que for vinculado por ministério" },
  { value: "atendimento", label: "Atendimento da Comunicação" },
  { value: "gestor_comunicacao", label: "Gestor de Comunicação" },
  { value: "administrador_tecnico", label: "Administrador técnico" },
];

const MINISTRY_ROLE_OPTIONS = [
  { value: "", label: "— nenhum —" },
  { value: "leitor", label: "Leitor" },
  { value: "colaborador", label: "Colaborador" },
  { value: "aprovador", label: "Aprovador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "atendimento", label: "Atendimento" },
];

/** Gera uma senha inicial legível e forte o bastante pra ser entregue à
 *  pessoa e trocada depois. Antes o campo vinha vazio e quem cadastrava
 *  acabava inventando "123456" na pressa. */
function suggestPassword(): string {
  const words = ["atitude", "portal", "ministerio", "creative", "evento", "equipe"];
  const word = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${n}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" form="form-novo-usuario" variant="primary" loading={pending}>
      {pending ? "Criando..." : "Criar usuário"}
    </Button>
  );
}

export function CreateUserForm({ ministries }: { ministries: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(createUser, { error: null as string | null });
  const [password, setPassword] = useState("");

  // Sugere uma senha nova toda vez que o diálogo abre.
  useEffect(() => {
    if (open) setPassword(suggestPassword());
  }, [open]);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} iconLeft={<Icon.Plus className="h-4 w-4" />}>
        Novo usuário
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo usuário"
        description="A conta é criada já confirmada no Supabase Auth — a pessoa entra direto com e-mail e senha."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton />
          </>
        }
      >
        <form id="form-novo-usuario" action={formAction} className="space-y-4">
          {state?.error && <Alert tone="danger">{state.error}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input name="fullName" label="Nome" placeholder="Nome completo" />
            <Input name="email" type="email" label="E-mail" required placeholder="pessoa@exemplo.com.br" />
            <Input
              name="password"
              type="text"
              label="Senha inicial"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="Entregue essa senha à pessoa — ela pode trocar depois."
              containerClassName="sm:col-span-2"
              iconRight={
                <button
                  type="button"
                  onClick={() => setPassword(suggestPassword())}
                  aria-label="Sugerir outra senha"
                  title="Sugerir outra senha"
                  className="rounded p-0.5 text-ink-3 transition hover:text-ink"
                >
                  <Icon.Refresh className="h-4 w-4" />
                </button>
              }
            />
            <Select
              name="papelGlobal"
              label="Papel global"
              defaultValue="nenhum"
              hint="Papel global dá acesso a todos os ministérios."
              containerClassName="sm:col-span-2"
            >
              {PAPEL_GLOBAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select name="ministryId" label="Vincular a um ministério" defaultValue="">
              <option value="">— nenhum —</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <Select name="ministryRole" label="Papel nesse ministério" defaultValue="">
              {MINISTRY_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </form>
      </Modal>
    </>
  );
}
