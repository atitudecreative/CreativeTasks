"use client";

import { useRef, useState, useTransition } from "react";
import { addComment, deleteComment } from "./actions";
import type { DemandComment } from "@/lib/data/comments";
import { Alert, Avatar, Button, Icon, Panel, Textarea, useToast } from "@/components/ui";

/* =========================================================================
   COMENTÁRIOS
   -------------------------------------------------------------------------
   Vira uma conversa de verdade: avatar com iniciais por autor, data
   relativa ("há 2 h", que é como se lê uma thread), e o botão de apagar
   só aparece no hover da própria mensagem — antes ficava permanentemente
   pendurado embaixo de cada comentário.

   Também ganhou envio por Ctrl/Cmd+Enter e confirmação por toast; apagar
   pede confirmação, porque é irreversível.
   ========================================================================= */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export function CommentsSection({
  demandId,
  comments,
  currentUserId,
  canModerate,
}: {
  demandId: string;
  comments: DemandComment[];
  currentUserId: string | null;
  canModerate: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addComment(demandId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        toast.success("Comentário publicado");
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Apagar este comentário? Não tem como desfazer.")) return;
    startTransition(async () => {
      try {
        await deleteComment(demandId, id);
        toast.success("Comentário apagado");
      } catch {
        // A ação agora lança quando a policy barra ou a escrita falha.
        // Sem este catch, o toast verde apareceria de qualquer jeito e o
        // comentário continuaria lá depois do F5.
        toast.error({
          title: "Não foi possível apagar",
          description: "Você só pode apagar os próprios comentários. Se o comentário é seu, tente de novo.",
        });
      }
    });
  }

  return (
    <Panel
      title="Conversa"
      description={comments.length > 0 ? `${comments.length} ${comments.length === 1 ? "comentário" : "comentários"}` : undefined}
    >
      {comments.length === 0 ? (
        <p className="mb-5 text-small text-ink-3">
          Nenhum comentário ainda. Use este espaço para registrar combinados, dúvidas ou decisões sobre esta demanda.
        </p>
      ) : (
        <ul className="mb-5 space-y-4">
          {comments.map((c) => {
            const canDelete = canModerate || (currentUserId && currentUserId === c.authorId);
            return (
              <li key={c.id} className="group flex gap-3">
                <Avatar name={c.authorName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <span className="text-small font-medium text-ink">{c.authorName}</span>
                    <time dateTime={c.created_at} className="text-caption text-ink-3" title={new Date(c.created_at).toLocaleString("pt-BR")}>
                      {relativeTime(c.created_at)}
                    </time>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={isPending}
                        aria-label="Apagar comentário"
                        className="ml-auto rounded p-1 text-ink-3 opacity-0 transition duration-120 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Icon.Trash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-small leading-relaxed text-ink-2">{c.corpo}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form ref={formRef} action={handleSubmit} className="border-t border-line pt-4">
        {error && (
          <Alert tone="danger" className="mb-3">
            {error}
          </Alert>
        )}
        <Textarea
          name="corpo"
          rows={3}
          required
          placeholder="Escreva um comentário..."
          aria-label="Novo comentário"
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter envia — atalho esperado em qualquer caixa de
            // comentário; Enter sozinho continua quebrando linha.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-3">⌘ + ↵ para enviar</p>
          <Button type="submit" variant="primary" size="sm" loading={isPending}>
            Comentar
          </Button>
        </div>
      </form>
    </Panel>
  );
}
