"use client";

import { useMemo, useState } from "react";
import { CampaignRow, type CampaignRowData } from "./CampaignRow";
import { FolderBlock } from "./FolderBlock";
import { createCampaignFolder } from "./actions";

export type AdminCampaignRow = CampaignRowData & {
  ministry_id: string;
  ministryName: string;
};

export type AdminCampaignFolder = {
  id: string;
  ministry_id: string;
  nome: string;
};

function NewFolderForm({ ministryId }: { ministryId: string }) {
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
      <input type="hidden" name="ministryId" value={ministryId} />
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

function MinistryGroup({
  ministryId,
  ministryName,
  campaigns,
  folders,
  defaultOpen,
}: {
  ministryId: string;
  ministryName: string;
  campaigns: AdminCampaignRow[];
  folders: AdminCampaignFolder[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const activeCount = campaigns.filter((c) => c.publicada).length;

  const folderList = folders
    .filter((f) => f.ministry_id === ministryId)
    .map((f) => ({ id: f.id, nome: f.nome }));

  const semPasta = campaigns.filter((c) => !c.folder_id || !folderList.some((f) => f.id === c.folder_id));

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-neutral-700">
          {ministryName}{" "}
          <span className="font-normal text-neutral-400">
            ({activeCount} ativa{activeCount !== 1 ? "s" : ""} de {campaigns.length})
          </span>
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

      {open && (
        <div className="space-y-3 border-t border-neutral-100 p-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Pastas</p>
            <NewFolderForm ministryId={ministryId} />
          </div>

          {folderList.map((folder) => (
            <FolderBlock
              key={folder.id}
              folder={folder}
              campaigns={campaigns.filter((c) => c.folder_id === folder.id)}
              allFolders={folderList}
            />
          ))}

          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <div className="bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-600">
              Sem pasta <span className="font-normal text-neutral-400">({semPasta.length})</span>
            </div>
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
          </div>
        </div>
      )}
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
        !term || c.nome.toLowerCase().includes(term) || c.ministryName.toLowerCase().includes(term);
      const matchesStatus =
        !statusFilter || (statusFilter === "ativas" ? c.publicada : !c.publicada);
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { ministryId: string; ministryName: string; campaigns: AdminCampaignRow[] }>();
    for (const c of filtered) {
      const entry = map.get(c.ministry_id) ?? { ministryId: c.ministry_id, ministryName: c.ministryName, campaigns: [] };
      entry.campaigns.push(c);
      map.set(c.ministry_id, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.ministryName.localeCompare(b.ministryName, "pt-BR"));
  }, [filtered]);

  // Com busca ativa faz sentido já abrir os grupos que bateram — sem
  // busca, tudo começa fechado (é a mesma ideia das demandas por mês: não
  // afogar a tela com listão gigante logo de cara).
  const hasActiveFilter = Boolean(search.trim() || statusFilter);

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
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          {campaigns.length === 0
            ? "Nenhuma campanha cadastrada ainda."
            : "Nenhuma campanha encontrada para esse filtro."}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => (
            <MinistryGroup
              key={g.ministryId}
              ministryId={g.ministryId}
              ministryName={g.ministryName}
              campaigns={g.campaigns}
              folders={folders}
              defaultOpen={hasActiveFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
