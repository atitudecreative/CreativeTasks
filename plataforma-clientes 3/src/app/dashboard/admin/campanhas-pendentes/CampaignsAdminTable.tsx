"use client";

import { useMemo, useState } from "react";
import { FolderBlock } from "./FolderBlock";
import type { CampaignRowData } from "./CampaignRow";
import { createCampaignFolder, createCampaign } from "./actions";
import { TIPO_OPTIONS } from "@/lib/campaignOptions";
import { Button, EmptyState, Icon, Input, SearchInput, Select, Tabs } from "@/components/ui";
import { useAcao } from "./useAcao";
// Só o tipo — importar um valor desse módulo arrastaria @/lib/supabase/server
// (next/headers) pro bundle do cliente. Ver metaAdsMath.ts pro mesmo padrão.
import type { Ministry } from "@/lib/data/ministries";

// Tags viraram globais (migration 0018) — uma campanha não pertence mais
// a um ministério só, então a lista não agrupa mais por ministério.
// `ministryNames` (já em CampaignRowData) mostra quem está envolvido.
export type AdminCampaignRow = CampaignRowData;

export type AdminCampaignFolder = {
  id: string;
  nome: string;
};

type Painel = null | "campanha" | "pasta";

function NewFolderForm({ onDone }: { onDone: () => void }) {
  const { pendente, executar } = useAcao();
  const [nome, setNome] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) return;
        executar(createCampaignFolder, { nome: nome.trim() }, {
          sucesso: `Pasta "${nome.trim()}" criada.`,
          falha: "Não foi possível criar a pasta.",
        });
        onDone();
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <Input
        label="Nome da pasta"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        required
        autoFocus
        placeholder="Ex.: Festa da Roça"
        containerClassName="min-w-0 flex-1"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={pendente}>
          Criar pasta
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// Cria campanha do zero, na mão — pensado pro caso do sync do Asana estar
// fora do ar/travado e a Comunicação não poder esperar a tag virar
// campanha sozinha. A action redireciona para a edição, para completar os
// outros campos (fase, orçamento, etc.) — por isso aqui é um <form> comum.
function NewCampaignForm({ ministries, onDone }: { ministries: Ministry[]; onDone: () => void }) {
  return (
    <form action={createCampaign} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end">
      <Input
        name="nome"
        label="Nome"
        required
        autoFocus
        placeholder="Ex.: o nome da tag no Asana"
        containerClassName="sm:col-span-2 lg:col-span-1"
      />
      <Select name="tipo" label="Tipo" defaultValue="campanha">
        {TIPO_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <Select name="ministryId" label="Ministério de origem" required defaultValue="">
        <option value="" disabled>
          Escolha...
        </option>
        {ministries.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit" variant="primary">
          Criar e editar
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function CampaignsAdminTable({
  campaigns,
  folders,
  ministries,
}: {
  campaigns: AdminCampaignRow[];
  folders: AdminCampaignFolder[];
  ministries: Ministry[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | "ativas" | "ocultas">("todas");
  const [painel, setPainel] = useState<Painel>(null);

  const visiveis = campaigns.filter((c) => c.publicada).length;
  const ocultas = campaigns.length - visiveis;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      const matchesSearch =
        !term ||
        c.nome.toLowerCase().includes(term) ||
        c.ministryNames.some((n) => n.toLowerCase().includes(term));
      const matchesStatus =
        statusFilter === "todas" || (statusFilter === "ativas" ? c.publicada : !c.publicada);
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const hasActiveFilter = Boolean(search.trim() || statusFilter !== "todas");

  const folderList = folders.map((f) => ({ id: f.id, nome: f.nome }));
  const semPasta = filtered.filter((c) => !c.folder_id || !folderList.some((f) => f.id === c.folder_id));

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por nome ou ministério"
          aria-label="Buscar campanhas"
          className="lg:max-w-sm lg:flex-1"
        />
        <Tabs<"todas" | "ativas" | "ocultas">
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { value: "todas", label: "Todas", count: campaigns.length },
            { value: "ativas", label: "Visíveis", count: visiveis },
            { value: "ocultas", label: "Ocultas", count: ocultas },
          ]}
        />
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Icon.Folder className="h-3.5 w-3.5" />}
            onClick={() => setPainel(painel === "pasta" ? null : "pasta")}
            aria-expanded={painel === "pasta"}
          >
            Nova pasta
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Icon.Plus className="h-3.5 w-3.5" />}
            onClick={() => setPainel(painel === "campanha" ? null : "campanha")}
            aria-expanded={painel === "campanha"}
          >
            Nova campanha
          </Button>
        </div>
      </div>

      {painel && (
        <div className="mb-4 rounded-panel border border-line bg-surface p-4 shadow-xs animate-fade-in sm:p-5">
          <p className="mb-3 text-h4 text-ink">{painel === "pasta" ? "Nova pasta" : "Nova campanha"}</p>
          {painel === "pasta" ? (
            <NewFolderForm onDone={() => setPainel(null)} />
          ) : (
            <NewCampaignForm ministries={ministries} onDone={() => setPainel(null)} />
          )}
        </div>
      )}

      <p className="mb-3 text-caption text-ink-3" aria-live="polite">
        {hasActiveFilter ? `${filtered.length} de ${campaigns.length} campanhas` : `${campaigns.length} campanhas`}
      </p>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Icon.Megaphone className="h-5 w-5" />}
          title="Nenhuma campanha cadastrada ainda"
          description="Campanhas nascem sozinhas das tags do Asana a cada sincronização. Para criar uma na mão, use Nova campanha."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Icon.Search className="h-5 w-5" />}
          title="Nenhuma campanha encontrada"
          description="Nada casa com a busca e o filtro atuais. Limpe a busca ou escolha Todas."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("todas");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {folderList.map((folder) => {
            const folderCampaigns = filtered.filter((c) => c.folder_id === folder.id);
            if (hasActiveFilter && folderCampaigns.length === 0) return null;
            return (
              <FolderBlock key={folder.id} folder={folder} campaigns={folderCampaigns} allFolders={folderList} />
            );
          })}

          {/* "Sem pasta" é onde toda campanha nova cai — é a fila de
              trabalho desta tela. Nascia FECHADA quando havia qualquer
              pasta, e a tela abria mostrando só uma pasta vazia. */}
          {(!hasActiveFilter || semPasta.length > 0) && (
            <FolderBlock folder={null} campaigns={semPasta} allFolders={folderList} />
          )}
        </div>
      )}
    </div>
  );
}
