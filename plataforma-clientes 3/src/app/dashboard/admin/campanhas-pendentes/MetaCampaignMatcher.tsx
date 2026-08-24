"use client";

import { useState, useTransition } from "react";
import { linkMetaCampaign, unlinkMetaCampaign } from "./actions";
import type { MetaAdCampaign } from "@/lib/data/metaAds";

export function MetaCampaignMatcher({
  metaCampaigns,
  portalCampaigns,
}: {
  metaCampaigns: MetaAdCampaign[];
  portalCampaigns: { id: string; nome: string }[];
}) {
  if (metaCampaigns.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <p className="mb-1 text-sm font-semibold text-amber-900">
        Campanhas do Meta Ads sem vínculo ({metaCampaigns.length})
      </p>
      <p className="mb-4 text-xs text-amber-800">
        O sync não achou uma campanha do portal com o mesmo nome pra essas — escolha manualmente
        ou marque como "sem correspondência" pra parar de aparecer aqui.
      </p>
      <div className="divide-y divide-amber-200/70">
        {metaCampaigns.map((mc) => (
          <MetaCampaignRow key={mc.id} metaCampaign={mc} portalCampaigns={portalCampaigns} />
        ))}
      </div>
    </div>
  );
}

function MetaCampaignRow({
  metaCampaign,
  portalCampaigns,
}: {
  metaCampaign: MetaAdCampaign;
  portalCampaigns: { id: string; nome: string }[];
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-[10rem] flex-1">
        <p className="text-sm font-medium text-neutral-800">{metaCampaign.nome}</p>
        <p className="text-xs text-neutral-500">
          {metaCampaign.status ?? "status desconhecido"} · alcance {metaCampaign.alcance ?? 0} · investido{" "}
          {(metaCampaign.investimento ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      >
        <option value="">Escolher campanha do portal...</option>
        {portalCampaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!selected || isPending}
        onClick={() => {
          const fd = new FormData();
          fd.set("metaAdCampaignId", metaCampaign.id);
          fd.set("campaignId", selected);
          startTransition(() => linkMetaCampaign(fd));
        }}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Vincular
      </button>

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const fd = new FormData();
          fd.set("metaAdCampaignId", metaCampaign.id);
          startTransition(() => unlinkMetaCampaign(fd));
        }}
        className="text-xs text-neutral-500 hover:underline disabled:opacity-50"
      >
        Sem correspondência
      </button>
    </div>
  );
}
