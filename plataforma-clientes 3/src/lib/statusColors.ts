// Cores por status de demanda. Arquivo sem nenhuma dependência de servidor
// (sem Supabase, sem next/headers) de propósito — pode ser importado tanto
// de Server Components quanto de Client Components sem risco de quebrar o
// build (ver histórico: componente cliente importando algo que puxa
// next/headers derruba o build).
export const STATUS_COLOR: Record<string, string> = {
  recebida: "bg-neutral-100 text-neutral-600",
  em_triagem: "bg-sky-50 text-sky-700",
  aguardando_briefing: "bg-amber-50 text-amber-700",
  planejada: "bg-indigo-50 text-indigo-700",
  em_producao: "bg-brand-50 text-brand-700",
  em_revisao_interna: "bg-violet-50 text-violet-700",
  aguardando_ministerio: "bg-amber-50 text-amber-700",
  aguardando_aprovacao: "bg-amber-50 text-amber-700",
  ajustes_solicitados: "bg-rose-50 text-rose-700",
  aprovada: "bg-teal-50 text-teal-700",
  agendada_ou_publicada: "bg-cyan-50 text-cyan-700",
  concluida: "bg-green-50 text-green-700",
  pausada: "bg-neutral-100 text-neutral-500",
  cancelada: "bg-rose-100 text-rose-700",
};

export const DEFAULT_STATUS_COLOR = "bg-neutral-100 text-neutral-600";
