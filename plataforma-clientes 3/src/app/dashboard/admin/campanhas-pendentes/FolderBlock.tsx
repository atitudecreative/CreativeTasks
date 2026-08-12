"use client";

import { useState } from "react";
import { renameCampaignFolder, deleteCampaignFolder } from "./actions";
import { CampaignRow, type CampaignRowData } from "./CampaignRow";

export function FolderBlock({
  folder,
  campaigns,
  allFolders,
}: {
  folder: { id: string; nome: string };
  campaigns: CampaignRowData[];
  allFolders: { id: string; nome: string }[];
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between gap-2 bg-neutral-50 px-4 py-2">
        {renaming ? (
          <form
            action={async (formData) => {
              await renameCampaignFolder(formData);
              setRenaming(false);
            }}
            className="flex flex-1 items-center gap-2"
          >
            <input type="hidden" name="id" value={folder.id} />
            <svg className="h-4 w-4 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <input
              name="nome"
              defaultValue={folder.nome}
              required
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
              Salvar
            </button>
            <button type="button" onClick={() => setRenaming(false)} className="text-xs text-neutral-500 hover:underline">
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <button type="button" onClick={() => setRenaming(true)} className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <svg className="h-4 w-4 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              {folder.nome}
              <span className="font-normal text-neutral-400">({campaigns.length})</span>
            </button>
            <form
              action={deleteCampaignFolder}
              onSubmit={(e) => {
                const detalhe = campaigns.length > 0 ? ` As ${campaigns.length} campanha(s) dentro ficam sem pasta.` : "";
                if (!window.confirm(`Excluir a pasta "${folder.nome}"?${detalhe}`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={folder.id} />
              <button type="submit" className="text-xs font-medium text-neutral-400 hover:text-rose-600">
                Excluir pasta
              </button>
            </form>
          </>
        )}
      </div>

      {campaigns.length === 0 ? (
        <p className="px-4 py-3 text-xs text-neutral-400">Nenhuma campanha nessa pasta ainda.</p>
      ) : (
        campaigns.map((c, i) => (
          <CampaignRow
            key={c.id}
            campaign={c}
            folders={allFolders}
            prevId={campaigns[i - 1]?.id}
            nextId={campaigns[i + 1]?.id}
          />
        ))
      )}
    </div>
  );
}
