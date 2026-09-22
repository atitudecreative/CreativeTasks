import type { BadgeTone } from "@/components/ui/Badge";
import { stageOf } from "@/lib/demandStages";

/* =========================================================================
   TOM POR STATUS
   -------------------------------------------------------------------------
   Antes cada status tinha uma cor escolhida a dedo, tiradas de nove
   paletas diferentes (sky, indigo, teal, cyan, violet, rose, emerald...).
   Quatorze cores sem sistema: nada dizia ao usuário o que era bom, o que
   era espera e o que era problema.

   Agora o tom sai do ESTÁGIO do status (lib/demandStages), então só
   existem cinco leituras possíveis e elas são consistentes em toda a
   plataforma. `ajustes_solicitados` e `cancelada` são exceções explícitas:
   são estados negativos que precisam ler como alerta, não como o estágio
   em que estão.

   Arquivo sem nenhuma dependência de servidor de propósito — importável
   de Server e Client Component (ver histórico: componente cliente puxando
   algo que importa next/headers derruba o build).
   ========================================================================= */

const STAGE_TONE: Record<string, BadgeTone> = {
  fila: "info",
  producao: "accent",
  ministerio: "warning",
  concluida: "success",
  parada: "neutral",
};

const STATUS_TONE_OVERRIDE: Record<string, BadgeTone> = {
  ajustes_solicitados: "danger",
  cancelada: "danger",
};

export function statusTone(status: string): BadgeTone {
  return STATUS_TONE_OVERRIDE[status] ?? STAGE_TONE[stageOf(status)] ?? "neutral";
}

/* --------------------------- SAÚDE DE CAMPANHA ---------------------------
   Aqui a escala é ordinal (no caminho -> atenção -> crítica), então o
   mapeamento é direto pros tons semânticos. Antes "concluída" era azul
   claro e "no caminho" verde-limão, o que invertia a leitura de
   importância. */
export const SAUDE_TONE: Record<string, BadgeTone> = {
  no_caminho: "success",
  atencao: "warning",
  critica: "danger",
  pausada: "neutral",
  concluida: "info",
};

export function saudeTone(saude: string): BadgeTone {
  return SAUDE_TONE[saude] ?? "neutral";
}

/* --------------------------- ENTREGAS --------------------------- */
export const DELIVERABLE_TONE: Record<string, BadgeTone> = {
  rascunho: "neutral",
  para_aprovacao: "warning",
  aprovado: "success",
  final: "success",
  arquivado: "neutral",
};

export function deliverableTone(status: string): BadgeTone {
  return DELIVERABLE_TONE[status] ?? "neutral";
}
