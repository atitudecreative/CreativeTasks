"use client";

import { useState } from "react";
import { deleteMinistry } from "./actions";
import { Alert, Button, IconButton, Icon, Input, Modal } from "@/components/ui";

/* =========================================================================
   EXCLUIR MINISTÉRIO
   -------------------------------------------------------------------------
   Era um window.confirm(). Para uma ação que apaga em cascata usuários,
   demandas, campanhas e entregas, isso é frágil demais: o diálogo nativo
   é fácil de aceitar no automático e não mostra o que está em jogo.

   Agora é um diálogo próprio que (a) lista o que será apagado, e (b) só
   libera o botão depois que a pessoa DIGITA o nome do ministério. É a
   proteção padrão para exclusão destrutiva — custa cinco segundos e evita
   uma perda irreversível.
   ========================================================================= */
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
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const confirmed = typed.trim().toLowerCase() === name.trim().toLowerCase();

  return (
    <>
      {variant === "full" ? (
        <Button variant="danger" onClick={() => setOpen(true)} iconLeft={<Icon.Trash className="h-4 w-4" />}>
          Excluir ministério
        </Button>
      ) : (
        <IconButton
          label={`Excluir ${name}`}
          size="sm"
          onClick={() => setOpen(true)}
          className="text-ink-3 hover:bg-danger-soft hover:text-danger"
        >
          <Icon.Trash className="h-3.5 w-3.5" />
        </IconButton>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setTyped("");
        }}
        title="Excluir ministério"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              Cancelar
            </Button>
            <form action={deleteMinistry}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="danger" disabled={!confirmed}>
                Excluir definitivamente
              </Button>
            </form>
          </>
        }
      >
        <Alert tone="danger" title="Esta ação não pode ser desfeita" className="mb-4">
          Excluir <strong>{name}</strong> apaga também tudo que está vinculado a ele.
        </Alert>

        <ul className="mb-4 space-y-1.5 text-small text-ink-2">
          <li className="flex items-center gap-2">
            <Icon.Users className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            {memberCount} {memberCount === 1 ? "vínculo de usuário" : "vínculos de usuário"}
          </li>
          <li className="flex items-center gap-2">
            <Icon.ListChecks className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            {demandCount} {demandCount === 1 ? "demanda" : "demandas"}
          </li>
          <li className="flex items-center gap-2">
            <Icon.Megaphone className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            Campanhas, entregas e a fonte de dados do Asana
          </li>
        </ul>

        <Input
          label={`Digite "${name}" para confirmar`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={name}
          autoComplete="off"
        />
      </Modal>
    </>
  );
}
