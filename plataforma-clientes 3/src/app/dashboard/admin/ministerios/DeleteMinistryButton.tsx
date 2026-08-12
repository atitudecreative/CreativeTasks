"use client";

import { deleteMinistry } from "./actions";

export function DeleteMinistryButton({
  id,
  name,
  memberCount,
  demandCount,
  variant = "compact",
}: {
  id: string;
  name: string;
  memberCount: number;
  demandCount: number;
  variant?: "compact" | "full";
}) {
  return (
    <form
      action={deleteMinistry}
      onSubmit={(e) => {
        const detalhe =
          memberCount > 0 || demandCount > 0
            ? ` Isso apaga também ${memberCount} vínculo(s) de usuário e ${demandCount} demanda(s) ligadas a ele.`
            : "";
        const confirmed = window.confirm(
          `Excluir o ministério "${name}"? Essa ação não pode ser desfeita.${detalhe}`
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {variant === "full" ? (
        <button
          type="submit"
          className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          Excluir ministério
        </button>
      ) : (
        <button type="submit" className="text-xs font-medium text-neutral-500 hover:text-rose-600">
          Excluir
        </button>
      )}
    </form>
  );
}
