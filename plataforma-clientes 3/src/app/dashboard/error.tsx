"use client";

import { useEffect } from "react";
import { Button, ErrorState, Icon } from "@/components/ui";

/* Erro dentro do dashboard: a casca (sidebar, header) continua de pé, só
   a área de conteúdo é substituída — a pessoa não perde a navegação e
   consegue ir pra outra tela sem recarregar. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no dashboard:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-10">
      <ErrorState
        title="Não conseguimos carregar esta tela"
        description="Pode ser uma instabilidade momentânea na conexão com o banco. Tente de novo; se continuar, avise a equipe de Comunicação."
        action={
          <Button variant="primary" onClick={reset} iconLeft={<Icon.Refresh className="h-4 w-4" />}>
            Tentar de novo
          </Button>
        }
      />
      {error.digest && (
        <p className="mt-4 text-center font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-3">
          código {error.digest}
        </p>
      )}
    </div>
  );
}
