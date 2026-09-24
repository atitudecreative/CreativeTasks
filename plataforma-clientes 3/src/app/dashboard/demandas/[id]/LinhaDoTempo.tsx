import { formatarDataCompleta } from "@/lib/dates";
import { marcosDaDemanda, type Marco } from "@/lib/demandTimeline";
import { cn, Icon } from "@/components/ui";

/* =========================================================================
   LINHA DO TEMPO DA DEMANDA
   -------------------------------------------------------------------------
   As mesmas quatro datas que já existiam na ficha lateral, agora em
   sequência e com o tempo entre elas.

   Forma: uma linha vertical com quatro paradas. Não é enfeite — a pergunta
   é "onde isso está no caminho", e caminho se lê como caminho. Marco sem
   data no banco fica apagado e escrito "não registrada": é diferente de
   "não aconteceu", e a tela não tem como saber qual dos dois é.

   Sem cor por enfeite: só o prazo vencido recebe cor, porque é o único
   estado que pede ação.
   ========================================================================= */

const ICONE: Record<Marco["chave"], React.ReactNode> = {
  solicitada: <Icon.Inbox className="h-3.5 w-3.5" />,
  iniciada: <Icon.Play className="h-3.5 w-3.5" />,
  prazo: <Icon.Calendar className="h-3.5 w-3.5" />,
  concluida: <Icon.CheckCircle className="h-3.5 w-3.5" />,
};

export function LinhaDoTempo({
  demand,
  hoje,
}: {
  demand: {
    status: string;
    data_solicitacao?: string | null;
    data_inicio?: string | null;
    prazo_acordado: string | null;
    data_conclusao: string | null;
  };
  hoje: string;
}) {
  const marcos = marcosDaDemanda(demand, hoje);

  return (
    <ol className="relative space-y-4 pl-6">
      {/* O fio. Começa e termina no centro dos marcadores das pontas, para
          não sobrar risco solto acima do primeiro e abaixo do último. */}
      <span aria-hidden="true" className="absolute bottom-2 left-[9px] top-2 w-px bg-line" />

      {marcos.map((m) => {
        const ausente = m.estado === "ausente";
        const vencido = m.estado === "vencido";

        return (
          <li key={m.chave} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-6 flex h-[19px] w-[19px] items-center justify-center rounded-full border bg-surface",
                ausente && "border-line text-ink-3",
                vencido && "border-danger text-danger",
                !ausente && !vencido && "border-line text-ink-2"
              )}
            >
              {ICONE[m.chave]}
            </span>

            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className={cn("text-small", ausente ? "text-ink-3" : "text-ink")}>{m.rotulo}</p>
              <p
                className={cn(
                  "text-caption tabular-nums",
                  ausente ? "text-ink-3" : vencido ? "text-danger" : "text-ink-2"
                )}
              >
                {/* "sem registro" e não "não registrada": o gênero muda de
                    marco para marco ("o prazo", "a conclusão") e a frase
                    tem que servir para os quatro. */}
                {ausente ? "sem registro" : formatarDataCompleta(m.data)}
              </p>
            </div>
            {m.nota && (
              <p className={cn("text-caption", vencido ? "text-danger" : "text-ink-3")}>{m.nota}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
