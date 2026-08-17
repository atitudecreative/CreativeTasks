"use client";

import { useState, useTransition } from "react";
import { getLinkPreview } from "@/lib/linkPreview";
import { DELIVERABLE_STATUS_LABEL, type Deliverable } from "@/lib/data/deliverables";
import { setDeliverableStatus } from "@/app/dashboard/entregas/actions";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

// Drive: tenta a miniatura (imagem de verdade, sem moldura do Drive em
// volta) primeiro. Só se ela falhar ao carregar (arquivo não é imagem, ou
// não está compartilhado como "qualquer pessoa com o link") é que cai
// pro visualizador embutido do Drive.
function DrivePreview({ imageUrl, embedUrl }: { imageUrl: string; embedUrl: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return <iframe src={embedUrl} className="aspect-video w-full rounded-lg border border-neutral-200" allow="autoplay" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- vem do Drive, sem domínio conhecido em build time
    <img
      src={imageUrl}
      alt=""
      onError={() => setImageFailed(true)}
      className="w-full rounded-lg border border-neutral-200 object-cover"
    />
  );
}

function LinkPreviewBlock({ url }: { url: string }) {
  const preview = getLinkPreview(url);

  if (preview.kind === "drive") {
    return <DrivePreview imageUrl={preview.imageUrl} embedUrl={preview.embedUrl} />;
  }

  if (preview.kind === "youtube") {
    return (
      <iframe
        src={preview.embedUrl}
        className="aspect-video w-full rounded-lg border border-neutral-200"
        allow="autoplay"
      />
    );
  }

  if (preview.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element -- vem de link externo (Drive, CDN etc.), sem domínio conhecido em build time
    return <img src={preview.url} alt="" className="w-full rounded-lg border border-neutral-200 object-cover" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600"
    >
      <span className="text-lg">🔗</span>
      <span>Abrir em {preview.domain}</span>
    </a>
  );
}

export function DeliverableCard({
  deliverable,
  canApprove,
}: {
  deliverable: Deliverable;
  canApprove: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium text-neutral-800">{deliverable.titulo}</p>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
          {DELIVERABLE_STATUS_LABEL[deliverable.status] ?? deliverable.status}
        </span>
      </div>
      <p className="mb-3 text-xs text-neutral-400">
        {deliverable.tipo_arquivo ?? "arquivo"} {deliverable.versao ? `· v${deliverable.versao}` : ""} ·{" "}
        {formatDate(deliverable.data_entrega)}
      </p>

      {deliverable.link_principal && (
        <div className="mb-3">
          <LinkPreviewBlock url={deliverable.link_principal} />
        </div>
      )}

      {deliverable.link_principal && (
        <a
          href={deliverable.link_principal}
          target="_blank"
          rel="noreferrer"
          className="mb-1 block text-sm text-brand-600 hover:underline"
        >
          Abrir entrega
        </a>
      )}

      {deliverable.links_complementares.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[11px] font-medium text-neutral-400">Materiais complementares</p>
          {deliverable.links_complementares.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-xs text-brand-600 hover:underline"
            >
              {link}
            </a>
          ))}
        </div>
      )}

      {deliverable.observacao_uso && (
        <p className="mt-3 text-xs text-neutral-500">{deliverable.observacao_uso}</p>
      )}

      {canApprove && deliverable.status === "para_aprovacao" && (
        <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() => setDeliverableStatus(deliverable.id, deliverable.ministry_id, "aprovado"))
            }
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Aprovar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() => setDeliverableStatus(deliverable.id, deliverable.ministry_id, "rascunho"))
            }
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          >
            Pedir ajuste
          </button>
        </div>
      )}
    </div>
  );
}
