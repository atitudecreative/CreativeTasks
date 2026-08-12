"use client";

import { useState } from "react";
import { CreateMinistryForm } from "./CreateMinistryForm";

export function AddMinistryToggle() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        + Novo ministério
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mb-2 text-xs text-neutral-500 hover:underline"
      >
        Cancelar
      </button>
      <CreateMinistryForm />
    </div>
  );
}
