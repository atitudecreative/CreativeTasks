"use client";

import { useMemo, useState } from "react";
import { CampaignRow, type CampaignRowData } from "./CampaignRow";
import { FolderBlock } from "./FolderBlock";
import { createCampaignFolder } from "./actions";

// Tags viraram globais (migration 0018) — uma campanha não pertence mais
// a um ministério só, então a lista não agrupa mais por ministério.
// `ministryNames` (já em CampaignRowData) mostra quem está envolvido.
export type AdminCampaignRow = CampaignRowData;

export type AdminCampaignFolder = {
  id: string;
  nome: string;
};

function NewFolderForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        + Nova pasta
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await createCampaignFolder(formData);
        setOpen(false);
      }}
      className="flex items-center gap-2"
    >
      <input
        name="nome"
        required
        autoFocus
        placeholder="Nome da pasta, ex: Festa da Roça"
        className="w-56 rounded-lg border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
        Criar
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:underline">
        Cancelar
      </button>
    </form>
  );
}

function Section({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-neutral-50 px-4 py-2 text-left"
      >
        <span className="text-sm font-medium text-neutral-600">
          {title} <span className="font-normal text-neutral-400">({count})</span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export function CampaignsAdminTable({
  campaigns,
  folders,
}: {
  campaigns: AdminCampaignRow[];
  folders: AdminCampaignFolder[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ativas" | "ocultas">("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      const matchesSearch =
        !term ||
        c.nome.toLowerCase().includes(term) ||
        c.ministryNames.some((n) => n.toLowerCase().includes(term));
      const matchesStatus = !statusFilter || (statusFilter === "ativas" ? c.publicada : !c.publicada);
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const hasActiveFilter = Boolean(search.trim() || statusFilter);

  const folderList = folders.map((f) => ({ id: f.id, nome: f.nome }));
  const semPasta = filtered.filter((c) => !c.folder_id || !folderList.some((f) => f.id === c.folder_id));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou ministério..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "ativas" | "ocultas")}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Todas</option>
          <option value="ativas">Ativas (visíveis)</option>
          <option value="ocultas">Ocultas</option>
        </select>
        <span className="text-xs text-neutral-400">
          {filtered.length} de {campaigns.length}
        </span>
        <div className="ml-auto">
          <NewFolderForm />
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma campanha cadastrada ainda.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma campanha encontrada para esse filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {folderList.map((folder) => {
            const folderCampaigns = filtered.filter((c) => c.folder_id === folder.id);
            if (hasActiveFilter && folderCampaigns.length === 0) return null;
            return (
              <FolderBlock key={folder.id} folder={folder} campaigns={folderCampaigns} allFolders={folderList} />
            );
          })}

          <Section title="Sem pasta" count={semPasta.length} defaultOpen={hasActiveFilter || folderList.length === 0}>
            {semPasta.length === 0 ? (
              <p className="px-4 py-3 text-xs text-neutral-400">Nenhuma campanha fora de pasta.</p>
            ) : (
              semPasta.map((c, i) => (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  folders={folderList}
                  prevId={semPasta[i - 1]?.id}
                  nextId={semPasta[i + 1]?.id}
                />
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
