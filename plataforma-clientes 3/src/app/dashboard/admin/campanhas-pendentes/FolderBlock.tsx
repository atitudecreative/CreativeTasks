"use client";

import { useState } from "react";
import { renameCampaignFolder, deleteCampaignFolder } from "./actions";
import { CampaignRow, type CampaignRowData } from "./CampaignRow";
import { Button, Icon, IconButton, Input, cn } from "@/components/ui";
import { useAcao } from "./useAcao";

/* Pasta de campanhas. Recolhível — com dez pastas abertas a lista vira um
   rolo — e com as ações da pasta (renomear, excluir) visíveis como botões.
   Antes, renomear era clicar no NOME da pasta, sem nenhum indício de que
   aquilo fazia alguma coisa. */
export function FolderBlock({
  folder,
  campaigns,
  allFolders,
  defaultOpen = true,
}: {
  /** null = o grupo "Sem pasta", que não se renomeia nem se exclui. */
  folder: { id: string; nome: string } | null;
  campaigns: CampaignRowData[];
  allFolders: { id: string; nome: string }[];
  defaultOpen?: boolean;
}) {
  const [aberta, setAberta] = useState(defaultOpen);
  const [renomeando, setRenomeando] = useState(false);
  const [nome, setNome] = useState(folder?.nome ?? "");
  const { pendente, executar } = useAcao();

  const titulo = folder?.nome ?? "Sem pasta";
  const ocultas = campaigns.filter((c) => !c.publicada).length;
  const corpoId = `pasta-${folder?.id ?? "sem"}`;

  return (
    <section className="overflow-hidden rounded-panel border border-line bg-surface shadow-xs">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-sunken/60 px-3 py-2">
        {renomeando && folder ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nome.trim()) return;
              executar(
                renameCampaignFolder,
                { id: folder.id, nome: nome.trim() },
                { sucesso: "Pasta renomeada.", falha: "Não foi possível renomear a pasta." }
              );
              setRenomeando(false);
            }}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          >
            <Input
              aria-label="Novo nome da pasta"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
              containerClassName="min-w-0 flex-1"
            />
            <Button type="submit" size="sm" variant="primary">
              Salvar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRenomeando(false)}>
              Cancelar
            </Button>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setAberta((v) => !v)}
              aria-expanded={aberta}
              aria-controls={corpoId}
              className="flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-control px-1 text-left"
            >
              <Icon.ChevronRight
                className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform duration-180", aberta && "rotate-90")}
              />
              <Icon.Folder className="h-4 w-4 shrink-0 text-ink-3" />
              <span className="truncate text-small font-medium text-ink">{titulo}</span>
              <span className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-ink-3">{campaigns.length}</span>
              {ocultas > 0 && (
                <span className="shrink-0 text-caption text-ink-3">
                  · {ocultas} {ocultas === 1 ? "oculta" : "ocultas"}
                </span>
              )}
            </button>
            {folder && (
              <div className={cn("flex shrink-0 items-center gap-0.5", pendente && "opacity-60")}>
                <IconButton label={`Renomear a pasta ${folder.nome}`} size="sm" onClick={() => setRenomeando(true)}>
                  <Icon.Edit className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label={`Excluir a pasta ${folder.nome}`}
                  size="sm"
                  className="hover:text-danger"
                  disabled={pendente}
                  onClick={() => {
                    const detalhe =
                      campaigns.length > 0 ? ` As ${campaigns.length} campanha(s) dentro ficam sem pasta.` : "";
                    if (!window.confirm(`Excluir a pasta "${folder.nome}"?${detalhe}`)) return;
                    executar(
                      deleteCampaignFolder,
                      { id: folder.id },
                      { sucesso: "Pasta excluída.", falha: "Não foi possível excluir a pasta." }
                    );
                  }}
                >
                  <Icon.Trash className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            )}
          </>
        )}
      </header>

      {aberta && (
        <div id={corpoId}>
          {campaigns.length === 0 ? (
            <p className="px-4 py-4 text-caption text-ink-3">
              {folder
                ? "Nenhuma campanha nesta pasta. Use o seletor de pasta de uma campanha para trazê-la para cá."
                : "Todas as campanhas estão em alguma pasta."}
            </p>
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
      )}
    </section>
  );
}
