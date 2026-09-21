"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "./actions";
import { Alert, Button, Icon, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" fullWidth loading={pending}>
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  );
}

export function LoginForm({ urlErrorMessage }: { urlErrorMessage: string | null }) {
  const [state, formAction] = useFormState(signIn, { error: null as string | null });
  const [showPassword, setShowPassword] = useState(false);

  const message = state?.error ?? urlErrorMessage;

  return (
    <form action={formAction} className="space-y-4">
      {message && <Alert tone="danger">{message}</Alert>}

      <Input
        type="email"
        name="email"
        label="E-mail"
        required
        autoComplete="email"
        // Entra focado: a tela de login tem um caminho só, e fazer a
        // pessoa clicar antes de digitar é atrito puro.
        autoFocus
        placeholder="voce@exemplo.com.br"
        iconLeft={<Icon.Message className="h-4 w-4" />}
      />

      <div>
        <Input
          type={showPassword ? "text" : "password"}
          name="password"
          label="Senha"
          required
          autoComplete="current-password"
          iconRight={
            // Mostrar/ocultar senha é acessibilidade prática: sem isso,
            // erro de digitação em senha longa só se descobre no envio.
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="rounded p-0.5 text-ink-3 transition hover:text-ink"
            >
              {showPassword ? <Icon.EyeOff className="h-4 w-4" /> : <Icon.Eye className="h-4 w-4" />}
            </button>
          }
        />
      </div>

      <SubmitButton />
    </form>
  );
}
