"use client";

import { useState } from "react";
import { Button, Icon, Modal } from "@/components/ui";
import { CreateMinistryForm } from "./CreateMinistryForm";

/* Criar ministério passa a ser um diálogo em vez de um formulário que
   empurrava a tabela pra baixo — a lista continua visível atrás, que é o
   contexto de quem está cadastrando (pra não duplicar um que já existe). */
export function AddMinistryToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} iconLeft={<Icon.Plus className="h-4 w-4" />}>
        Novo ministério
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo ministério"
        description="Depois de criar, você pode definir capa, cor e vincular usuários na tela de edição."
        size="lg"
      >
        <CreateMinistryForm onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
