"use client";

import { useEffect } from "react";
import { Button, ErrorState, Icon } from "@/components/ui";

/* =========================================================================
   FRONTEIRA DE ERRO GLOBAL
   -------------------------------------------------------------------------
   O projeto não tinha nenhuma: uma exceção em qualquer Server Component
   derrubava a rota inteira na tela de erro crua do Next, sem marca, sem
   explicação e sem saída. Agora o erro é contido, explicado e oferece as
   duas ações que resolvem 90% dos casos (tentar de novo / voltar ao
   início).
   ========================================================================= */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // O digest é o que permite achar o stack real no log do servidor —
    // a mensagem que chega ao navegador vem propositalmente genérica.
    console.error("Erro não tratado:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md">
        <ErrorState
          title="Algo deu errado por aqui"
          description="Não conseguimos carregar esta tela. Na maior parte das vezes é temporário — tente de novo em alguns segundos."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="primary" onClick={reset} iconLeft={<Icon.Refresh className="h-4 w-4" />}>
                Tentar de novo
              </Button>
              <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
                Ir para o início
              </Button>
            </div>
          }
        />
        {error.digest && (
          <p className="mt-4 text-center font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-3">
            código {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
