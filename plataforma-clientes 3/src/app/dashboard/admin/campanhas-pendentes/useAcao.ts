"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui";

/* Executa uma server action desta tela com retorno visual.

   Antes, cada botão (publicar, mover, excluir) era um <form> cru: o clique
   não dava sinal nenhum até a lista recarregar, e se o banco recusasse, a
   pessoa caía na tela de erro da página inteira. Aqui o clique vira
   "pendente" na hora, a confirmação aparece num aviso, e a falha vira uma
   frase — sem derrubar a tela em que ela estava trabalhando. */
export function useAcao() {
  const toast = useToast();
  const [pendente, iniciar] = useTransition();

  function executar(
    acao: (fd: FormData) => Promise<unknown>,
    campos: Record<string, string>,
    mensagens: { sucesso?: string; falha: string }
  ) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.set(k, v);
    iniciar(async () => {
      try {
        await acao(fd);
        if (mensagens.sucesso) toast.success(mensagens.sucesso);
      } catch {
        toast.error(`${mensagens.falha} Tente de novo; se continuar, recarregue a página.`);
      }
    });
  }

  return { pendente, executar };
}
