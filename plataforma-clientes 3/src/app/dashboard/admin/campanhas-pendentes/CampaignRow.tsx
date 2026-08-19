"use client";

import Link from "next/link";
import {
  setCampaignVisibility,
  deleteCampaign,
  moveCampaignToFolder,
  swapCampaignPositions,
} from "./actions";
import { TIPO_LABEL } from "@/lib/campaignOptions";

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

function VisibilityToggle({ id, publicada }: { id: string; publicada: boolean }) {
  return (
    <form action={setCampaignVisibility}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="publicada" value={(!publicada).toString()} />
      <button
        type="submit"
        title={publicada ? "Visível pro ministério — clique pra ocultar" : "Oculta — clique pra ativar"}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          publicada ? "bg-green-500" : "bg-neutral-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            publicada ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </form>
  );
}

function MoveButton({ idA, idB, disabled, direction }: { idA: string; idB: string; disabled: boolean; direction: "up" | "down" }) {
  return (
    <form action={swapCampaignPositions}>
      <input type="hidden" name="idA" value={idA} />
      <input type="hidden" name="idB" value={idB} />
      <button
        type="submit"
        disabled={disabled}
        title={direction === "up" ? "Mover pra cima" : "Mover pra baixo"}
        className="rounded p-0.5 text-neutral-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-20"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={direction === "up" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
          />
        </svg>
      </button>
    </form>
  );
}

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
  return (
    <div className="flex items-center gap-3 border-b border-neutral-50 px-4 py-3 last:border-0">
      <div className="flex shrink-0 flex-col">
        <MoveButton idA={campaign.id} idB={prevId ?? ""} disabled={!prevId} direction="up" />
        <MoveButton idA={campaign.id} idB={nextId ?? ""} disabled={!nextId} direction="down" />
      </div>

      <VisibilityToggle id={campaign.id} publicada={campaign.publicada} />

      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/campanhas/${campaign.id}`}
          className="truncate font-medium text-neutral-800 hover:underline"
        >
          {campaign.nome}
        </Link>
        <p className="text-xs text-neutral-400">
          {TIPO_LABEL[campaign.tipo] ?? campaign.tipo}
          {campaign.origem === "asana_tag" && " · detectada por tag do Asana"} ·{" "}
          {campaign.demandCount} {campaign.demandCount === 1 ? "demanda" : "demandas"}
          {campaign.ministryNames.length > 0 && (
            <>
              {" "}
              ·{" "}
              <span title="Ministérios com demanda vinculada a essa campanha">
                {campaign.ministryNames.join(", ")}
              </span>
            </>
          )}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          campaign.publicada ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
        }`}
      >
        {campaign.publicada ? "Ativa" : "Oculta"}
      </span>

      {folders.length > 0 && (
        <form
          action={moveCampaignToFolder}
          onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}
          className="shrink-0"
        >
          <input type="hidden" name="campaignId" value={campaign.id} />
          <select
            name="folderId"
            defaultValue={campaign.folder_id ?? ""}
            title="Mover pra pasta"
            className="rounded-lg border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Sem pasta</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </form>
      )}

      <Link
        href={`/dashboard/admin/campanhas-pendentes/${campaign.id}`}
        className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
      >
        Editar
      </Link>

      <form
        action={deleteCampaign}
        onSubmit={(e) => {
          const detalhe =
            campaign.demandCount > 0 ? ` ${campaign.demandCount} demanda(s) ficam sem essa campanha.` : "";
          if (!window.confirm(`Excluir "${campaign.nome}" definitivamente?${detalhe}`)) {
            e.preventDefault();
          }
        }}
        className="shrink-0"
      >
        <input type="hidden" name="id" value={campaign.id} />
        <button type="submit" className="text-xs font-medium text-neutral-400 hover:text-rose-600">
          Excluir
        </button>
      </form>
    </div>
  );
}
