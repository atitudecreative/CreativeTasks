"use client";

import { useRef, useState, useTransition } from "react";
import { addComment, deleteComment } from "./actions";
import type { DemandComment } from "@/lib/data/comments";

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

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addComment(demandId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-medium text-neutral-700">
        Comentários {comments.length > 0 && `(${comments.length})`}
      </p>

      {comments.length === 0 ? (
        <p className="mb-4 text-sm text-neutral-400">
          Nenhum comentário ainda — use aqui embaixo pra registrar combinados ou dúvidas sobre essa demanda.
        </p>
      ) : (
        <ul className="mb-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-neutral-50 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-700">{c.authorName}</span>
                <span className="text-[11px] text-neutral-400">
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-800">{c.corpo}</p>
              {(canModerate || (currentUserId && currentUserId === c.authorId)) && (
                <button
                  type="button"
                  onClick={() => startTransition(() => deleteComment(demandId, c.id))}
                  className="mt-1 text-[11px] text-neutral-400 hover:text-rose-600 hover:underline"
                >
                  apagar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={handleSubmit} className="flex items-start gap-2">
        <textarea
          name="corpo"
          rows={2}
          placeholder="Escreva um comentário..."
          className="flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
