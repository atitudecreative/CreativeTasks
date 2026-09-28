"use client";

import Link from "next/link";
import {
  setCampaignVisibility,
  deleteCampaign,
  moveCampaignToFolder,
  swapCampaignPositions,
} from "./actions";
import { TIPO_LABEL } from "@/lib/campaignOptions";
import { Badge, Icon, IconButton, Select, Switch, cn } from "@/components/ui";
import { useAcao } from "./useAcao";

export type CampaignRowData = {
  id: string;
  nome: string;
  tipo: string;
  publicada: boolean;
  origem?: string;
  demandCount: number;
  folder_id: string | null;
  // Nomes de todos os ministérios com demanda vinculada a essa campanha —
  // pode ter mais de um, já que tags são globais (migration 0018).
  ministryNames: string[];
};

/* =========================================================================
   LINHA DE CAMPANHA (Publicação de campanhas)
   -------------------------------------------------------------------------
   O controle que importa nesta tela é "o ministério vê ou não vê". Ele era
   um botão de 44px sem rótulo nenhum — só um `title` — e um selo "Ativa"
   repetindo a mesma informação à direita. Leitor de tela anunciava
   "botão", e só.

   Agora é um interruptor com rótulo ("Visível") e estado anunciado, e as
   ações secundárias (ordem, pasta, editar, excluir) ficam agrupadas à
   direita. No celular a linha quebra em duas: identidade em cima,
   controles embaixo — antes ela espremia o nome até sumir.
   ========================================================================= */

export function CampaignRow({
  campaign,
  folders,
  prevId,
  nextId,
}: {
  campaign: CampaignRowData;
  folders: { id: string; nome: string }[];
  prevId?: string;
  nextId?: string;
}) {
  const { pendente, executar } = useAcao();

  function alternarVisibilidade(publicar: boolean) {
    executar(
      setCampaignVisibility,
      { id: campaign.id, publicada: String(publicar) },
      {
        sucesso: publicar
          ? `"${campaign.nome}" agora aparece para o ministério.`
          : `"${campaign.nome}" foi ocultada do ministério.`,
        falha: publicar ? "Não foi possível publicar a campanha." : "Não foi possível ocultar a campanha.",
      }
    );
  }

  function mover(outroId: string) {
    executar(swapCampaignPositions, { idA: campaign.id, idB: outroId }, { falha: "Não foi possível reordenar." });
  }

  return (
    <div
      aria-busy={pendente}
      className={cn(
        "flex flex-col gap-3 border-b border-line px-4 py-3 transition-opacity last:border-0 sm:flex-row sm:items-center",
        pendente && "opacity-60"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex shrink-0 flex-col">
          {(["up", "down"] as const).map((dir) => {
            const alvo = dir === "up" ? prevId : nextId;
            return (
              <button
                key={dir}
                type="button"
                aria-label={dir === "up" ? `Mover ${campaign.nome} para cima` : `Mover ${campaign.nome} para baixo`}
                disabled={!alvo || pendente}
                onClick={() => alvo && mover(alvo)}
                className="flex h-6 w-6 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-neutral-soft hover:text-ink disabled:pointer-events-none disabled:opacity-25"
              >
                {dir === "up" ? <Icon.ChevronUp className="h-3.5 w-3.5" /> : <Icon.ChevronDown className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/campanhas/${campaign.id}`}
              className="inline-flex min-h-6 min-w-0 items-center truncate text-small font-medium text-ink hover:text-brand-600 hover:underline"
            >
              {campaign.nome}
            </Link>
            {!campaign.publicada && (
              <Badge tone="neutral" size="sm" icon={<Icon.EyeOff className="h-3 w-3" />}>
                Oculta
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-caption text-ink-3">
            {TIPO_LABEL[campaign.tipo] ?? campaign.tipo}
            {campaign.origem === "asana_tag" && " · veio de tag do Asana"} · {campaign.demandCount}{" "}
            {campaign.demandCount === 1 ? "demanda" : "demandas"}
            {campaign.ministryNames.length > 0 && <> · {campaign.ministryNames.join(", ")}</>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-9 sm:shrink-0 sm:pl-0">
        <Switch
          size="sm"
          checked={campaign.publicada}
          onCheckedChange={alternarVisibilidade}
          disabled={pendente}
          label="Visível"
        />

        {folders.length > 0 && (
          <Select
            aria-label={`Pasta de ${campaign.nome}`}
            // defaultValue + key: controlado, o select voltava para a pasta
            // antiga enquanto a ação rodava e só depois pulava para a nova.
            key={campaign.folder_id ?? "sem-pasta"}
            defaultValue={campaign.folder_id ?? ""}
            controlSize="sm"
            containerClassName="w-40"
            disabled={pendente}
            onChange={(e) =>
              executar(
                moveCampaignToFolder,
                { campaignId: campaign.id, folderId: e.target.value },
                {
                  sucesso: e.target.value ? "Campanha movida para a pasta." : "Campanha tirada da pasta.",
                  falha: "Não foi possível mover a campanha.",
                }
              )
            }
          >
            <option value="">Sem pasta</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Select>
        )}

        <Link
          href={`/dashboard/admin/campanhas-pendentes/${campaign.id}`}
          className="inline-flex h-control-sm items-center gap-1.5 rounded-control px-2 text-caption font-medium text-brand-600 transition-colors hover:bg-neutral-soft"
        >
          <Icon.Edit className="h-3.5 w-3.5" />
          Editar
        </Link>

        <IconButton
          label={`Excluir ${campaign.nome}`}
          size="sm"
          disabled={pendente}
          className="text-ink-3 hover:text-danger"
          onClick={() => {
            const detalhe =
              campaign.demandCount > 0 ? ` ${campaign.demandCount} demanda(s) ficam sem essa campanha.` : "";
            if (!window.confirm(`Excluir "${campaign.nome}" definitivamente?${detalhe}`)) return;
            executar(
              deleteCampaign,
              { id: campaign.id },
              { sucesso: `"${campaign.nome}" foi excluída.`, falha: "Não foi possível excluir a campanha." }
            );
          }}
        >
          <Icon.Trash className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
