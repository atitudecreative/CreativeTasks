"use client";

import { useState, useTransition } from "react";
import { getLinkPreview } from "@/lib/linkPreview";
import type { Deliverable } from "@/lib/data/deliverables";
import { DELIVERABLE_STATUS_LABEL } from "@/lib/deliverableOptions";
import { deliverableTone } from "@/lib/statusColors";
import { formatarDiaMes } from "@/lib/dates";
import { setDeliverableStatus } from "@/app/dashboard/entregas/actions";
import { Badge, Button, Card, Icon, cn, useToast } from "@/components/ui";

/** Domínio do link, pra o material complementar mostrar "drive.google.com"
 *  em vez de uma URL de 200 caracteres cortada. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(dateStr: string | null) {
  return dateStr ? formatarDiaMes(dateStr, "") || null : null;
}

/* Drive: tenta a miniatura (imagem de verdade, sem moldura do Drive em
   volta) primeiro; só se ela falhar cai pro visualizador embutido.
   Comportamento preservado do desenho anterior — funciona bem. */
function DrivePreview({ imageUrl, embedUrl, alt }: { imageUrl: string; embedUrl: string; alt: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return <iframe src={embedUrl} title={alt} className="aspect-video w-full bg-surface-sunken" allow="autoplay" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- vem do Drive, sem domínio conhecido em build time
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      onError={() => setImageFailed(true)}
      className="aspect-video w-full bg-surface-sunken object-cover"
    />
  );
}

/** Campo neutro com o domínio de destino — usado quando não há prévia
 *  possível E quando a que existia não carregou. */
function SemPrevia({ domain }: { domain: string }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 bg-surface-sunken">
      <Icon.Link className="h-5 w-5 text-ink-3" />
      <span className="max-w-[80%] truncate font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-3">
        {domain}
      </span>
    </div>
  );
}

/** Imagem externa que, se não carregar, vira o campo neutro em vez do
 *  ícone de imagem quebrada do navegador. O link pode ter expirado, o
 *  arquivo pode ter mudado de permissão, a rede pode falhar — e esta tela
 *  é a que o cliente abre. */
function ImagemExterna({ url, domain }: { url: string; domain: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) return <SemPrevia domain={domain} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- link externo, sem domínio conhecido em build time
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFalhou(true)}
      className="aspect-video w-full bg-surface-sunken object-cover"
    />
  );
}

function Preview({ url, alt }: { url: string; alt: string }) {
  const preview = getLinkPreview(url);

  if (preview.kind === "drive") return <DrivePreview imageUrl={preview.imageUrl} embedUrl={preview.embedUrl} alt={alt} />;

  if (preview.kind === "youtube") {
    return <iframe src={preview.embedUrl} title={alt} className="aspect-video w-full bg-surface-sunken" allow="autoplay" />;
  }

  if (preview.kind === "image") {
    return <ImagemExterna url={preview.url} domain={hostOf(preview.url)} />;
  }

  // Sem prévia possível: em vez de uma caixa tracejada com emoji 🔗, um
  // campo neutro com o domínio de destino — diz pra onde o link leva antes
  // de o usuário clicar.
  return <SemPrevia domain={preview.domain} />;
}

/* =========================================================================
   CARD DE ENTREGA
   -------------------------------------------------------------------------
   Duas correções de fundo além do visual:

   1. FEEDBACK. Aprovar ou pedir ajuste disparava a ação e não dizia nada —
      o card só mudava em silêncio, e num erro de rede nem isso. Agora tem
      estado de carregamento no botão e toast de confirmação/erro.
   2. A PRÉVIA vem antes do título e ocupa proporção fixa (16/9), então a
      grade não fica com cards de alturas diferentes quando um link tem
      imagem e o outro não.
   ========================================================================= */
export function DeliverableCard({
  deliverable,
  canApprove,
}: {
  deliverable: Deliverable;
  canApprove: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"aprovado" | "rascunho" | null>(null);
  const toast = useToast();

  const data = formatDate(deliverable.data_entrega);

  function change(status: "aprovado" | "rascunho") {
    setAction(status);
    startTransition(async () => {
      try {
        await setDeliverableStatus(deliverable.id, status);
        toast.success({
          title: status === "aprovado" ? "Entrega aprovada" : "Ajuste solicitado",
          description:
            status === "aprovado"
              ? `"${deliverable.titulo}" foi marcada como aprovada.`
              : `"${deliverable.titulo}" voltou para rascunho.`,
        });
      } catch {
        toast.error({
          title: "Não foi possível atualizar",
          description: "Verifique a conexão e tente de novo.",
        });
      } finally {
        setAction(null);
      }
    });
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {deliverable.link_principal && (
        <a
          href={deliverable.link_principal}
          target="_blank"
          rel="noreferrer"
          className="group relative block shrink-0 overflow-hidden"
          aria-label={`Abrir ${deliverable.titulo}`}
        >
          <Preview url={deliverable.link_principal} alt={deliverable.titulo} />
          <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-180 group-hover:bg-ink/35 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-caption font-medium text-ink shadow-md">
              <Icon.External className="h-3.5 w-3.5" />
              Abrir
            </span>
          </span>
        </a>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-h4 text-ink">{deliverable.titulo}</h3>
          <Badge tone={deliverableTone(deliverable.status)} size="sm" className="shrink-0">
            {DELIVERABLE_STATUS_LABEL[deliverable.status] ?? deliverable.status}
          </Badge>
        </div>

        <p className="flex flex-wrap items-center gap-x-1.5 text-caption text-ink-3">
          <span>{deliverable.tipo_arquivo ?? "arquivo"}</span>
          {deliverable.versao && <span>· v{deliverable.versao}</span>}
          {data && <span>· {data}</span>}
        </p>

        {deliverable.observacao_uso && (
          <p className="mt-2.5 text-caption leading-relaxed text-ink-2">{deliverable.observacao_uso}</p>
        )}

        {deliverable.links_complementares.length > 0 && (
          <div className="mt-3 border-t border-line pt-2.5">
            <p className="mb-1.5 font-mono text-label uppercase text-ink-3">Complementares</p>
            <ul className="space-y-1">
              {deliverable.links_complementares.map((link, i) => (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-6 items-center gap-1.5 text-caption text-brand-600 underline-offset-4 hover:underline"
                  >
                    <Icon.Link className="h-3 w-3 shrink-0" />
                    <span className="truncate">{hostOf(link)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canApprove && deliverable.status === "para_aprovacao" && (
          <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
            <Button
              size="sm"
              variant="primary"
              loading={isPending && action === "aprovado"}
              disabled={isPending}
              onClick={() => change("aprovado")}
              iconLeft={!isPending || action !== "aprovado" ? <Icon.Check className="h-3.5 w-3.5" /> : undefined}
            >
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={isPending && action === "rascunho"}
              disabled={isPending}
              onClick={() => change("rascunho")}
            >
              Pedir ajuste
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
