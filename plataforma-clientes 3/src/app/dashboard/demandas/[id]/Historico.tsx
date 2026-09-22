import { STATUS_LABEL } from "@/lib/demandOptions";
import { transicoesComDuracao, duracaoLegivel, type LinhaDeHistorico } from "@/lib/demandTimeline";
import type { Carga } from "@/lib/data/erros";
import { Badge, Icon, Panel } from "@/components/ui";
import { statusTone } from "@/lib/statusColors";

/* =========================================================================
   HISTÓRICO DE STATUS
   -------------------------------------------------------------------------
   Vem do audit_log, alimentado pelo trigger da migration 0030. Responde
   duas perguntas que a plataforma não sabia responder: por onde a demanda
   passou, e quanto tempo ficou parada em cada etapa.

   Só aparece para a Comunicação — é o que a policy da 0004 permite ler, e
   é também onde a informação é operacional (é quem trabalha o fluxo que
   precisa ver o gargalo).

   Três estados possíveis, todos honestos:
     - não carregou (banco fora, policy negando) -> avisa que não carregou
     - carregou vazio -> explica que o registro começa na migration 0030,
       em vez de sugerir que a demanda nunca mudou de status
     - tem linhas -> mostra a sequência com o tempo em cada status
   ========================================================================= */

export function Historico({ carga }: { carga: Carga<LinhaDeHistorico[]> }) {
  if (!carga.ok) {
    return (
      <Panel title="Histórico de status">
        <p className="text-small text-ink-2">
          Não foi possível carregar {carga.recurso}. O resto da demanda continua atualizado.
        </p>
      </Panel>
    );
  }

  const transicoes = transicoesComDuracao(carga.dados);

  if (transicoes.length === 0) {
    return (
      <Panel title="Histórico de status">
        <p className="text-small text-ink-2">
          Nenhuma mudança de status registrada para esta demanda.
        </p>
        <p className="mt-1 text-caption text-ink-3">
          O registro de transições começa a partir da migration 0030 — mudanças anteriores a ela
          não foram gravadas e não há como recuperá-las.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Histórico de status"
      description={`${transicoes.length} mudança${transicoes.length === 1 ? "" : "s"} registrada${transicoes.length === 1 ? "" : "s"}`}
      noPadding
    >
      <ul className="divide-y divide-line">
        {transicoes
          .slice()
          .reverse()
          .map((t) => (
            <li key={`${t.em}-${t.para}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-5">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {t.de && (
                  <>
                    <span className="truncate text-caption text-ink-3">
                      {STATUS_LABEL[t.de] ?? t.de}
                    </span>
                    <Icon.ArrowRight className="h-3 w-3 shrink-0 text-ink-3" />
                  </>
                )}
                <Badge tone={statusTone(t.para)} size="sm" dot>
                  {STATUS_LABEL[t.para] ?? t.para}
                </Badge>
              </span>

              <span className="text-caption tabular-nums text-ink-3">
                {new Date(t.em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </span>

              {t.horasNoAnterior != null && (
                <span className="text-caption tabular-nums text-ink-2">
                  {duracaoLegivel(t.horasNoAnterior)} no anterior
                </span>
              )}

              {/* Sem autor = escrita da automação: o sync roda com service
                  role e auth.uid() vem nulo. Dizer "Asana" seria chute —
                  qualquer escrita por service role cai aqui. */}
              <span className="text-caption text-ink-3">{t.autor ?? "automação"}</span>
            </li>
          ))}
      </ul>
    </Panel>
  );
}
