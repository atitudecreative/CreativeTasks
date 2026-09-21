import Link from "next/link";
import { Badge, EmptyState, Icon, Metric, Tooltip, cn } from "@/components/ui";
import { formatMoney, formatCompact } from "@/lib/metricLanguage";
import type { LeituraMinisterio } from "@/lib/carteira";

/* =========================================================================
   LEITURA DO MINISTÉRIO (Início)
   -------------------------------------------------------------------------
   Responde "como estamos indo" com o histórico do próprio ministério —
   uma pergunta que o Início não respondia: ele mostrava o estado de HOJE
   (demandas abertas, prazos) e nada sobre evolução.

   A sparkline é minúscula de propósito: ela não substitui o gráfico do
   relatório, só diz se a linha sobe ou desce. Cada ponto tem título
   acessível com o nome do evento e o valor.
   ========================================================================= */

function Sparkline({ serie }: { serie: { nome: string; valor: number }[] }) {
  if (serie.length < 2) return null;

  const valores = serie.map((s) => s.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;

  const largura = 100;
  const altura = 28;
  const pontos = serie.map((s, i) => ({
    x: (i / (serie.length - 1)) * largura,
    // SVG cresce pra baixo: inverte pra o valor maior ficar no topo.
    y: altura - ((s.valor - min) / span) * (altura - 4) - 2,
    ...s,
  }));

  const d = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const ultimo = pontos[pontos.length - 1];
  const subiu = serie[serie.length - 1].valor >= serie[0].valor;

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      preserveAspectRatio="none"
      className="h-7 w-full"
      role="img"
      aria-label={`Resultados por evento, do mais antigo ao mais recente: ${serie
        .map((s) => `${s.nome} ${s.valor}`)
        .join(", ")}.`}
    >
      <path
        d={d}
        fill="none"
        stroke={subiu ? "rgb(var(--success))" : "rgb(var(--ink-3))"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={ultimo.x} cy={ultimo.y} r={2.5} fill={subiu ? "rgb(var(--success))" : "rgb(var(--ink-3))"} />
    </svg>
  );
}

export function LeituraMinisterioPanel({ leitura }: { leitura: LeituraMinisterio }) {
  if (leitura.eventos === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Icon.Megaphone className="h-4 w-4" />}
        title="Nenhum evento publicado ainda"
        description="Quando houver eventos publicados, a evolução deles aparece aqui."
      />
    );
  }

  const { cpaMediano, cpaReferencia } = leitura;
  const comparaCpa = cpaMediano != null && cpaReferencia != null;
  const maisEficiente = comparaCpa && cpaMediano! < cpaReferencia!.mediana;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Metric
          size="compact"
          label="Eventos publicados"
          value={leitura.eventos}
          hint={leitura.dadosInsuficientes ? "ainda sem base para comparar" : undefined}
        />
        <Metric size="compact" label="Investido no total" value={formatMoney(leitura.investimento, true)} />
      </div>

      {leitura.melhorEvento && (
        <div className="border-t border-line pt-3">
          <p className="mb-1 font-mono text-label uppercase text-ink-3">Melhor marca</p>
          <Link
            href={`/dashboard/campanhas/${leitura.melhorEvento.id}`}
            className="group flex items-baseline justify-between gap-3"
          >
            <span className="min-w-0 truncate text-small font-medium text-ink transition-colors group-hover:text-brand-600">
              {leitura.melhorEvento.nome}
            </span>
            <span className="shrink-0 text-small tabular-nums text-ink-2">
              {leitura.melhorEvento.valor}{" "}
              <span className="text-caption text-ink-3">{leitura.melhorEvento.rotulo}</span>
            </span>
          </Link>
        </div>
      )}

      {leitura.serieResultados.length >= 2 && (
        <div className="border-t border-line pt-3">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="font-mono text-label uppercase text-ink-3">Resultados por evento</p>
            <span className="text-caption text-ink-3">
              {leitura.serieResultados.length} eventos
            </span>
          </div>
          <Sparkline serie={leitura.serieResultados} />
          <div className="mt-1 flex justify-between font-mono text-[0.625rem] text-ink-3">
            <span className="truncate">{leitura.serieResultados[0].nome}</span>
            <span className="truncate">{leitura.serieResultados[leitura.serieResultados.length - 1].nome}</span>
          </div>
        </div>
      )}

      {comparaCpa && (
        <div className="border-t border-line pt-3">
          <p className="mb-1 font-mono text-label uppercase text-ink-3">Eficiência</p>
          <p className="text-small text-ink-2">
            Custo por resultado mediano de{" "}
            <strong className={cn("font-semibold", maisEficiente ? "text-success" : "text-ink")}>
              {formatMoney(cpaMediano)}
            </strong>{" "}
            —{" "}
            <Tooltip content={`Faixa usual dos demais eventos: ${formatMoney(cpaReferencia!.p25)} a ${formatMoney(cpaReferencia!.p75)}.`}>
              <span className="cursor-help underline decoration-dotted underline-offset-2">
                {maisEficiente ? "abaixo" : "acima"} da mediana geral
              </span>
            </Tooltip>{" "}
            de {formatMoney(cpaReferencia!.mediana)}.
          </p>
          <p className="mt-1 text-caption text-ink-3">
            Comparado com {cpaReferencia!.n} {cpaReferencia!.n === 1 ? "evento" : "eventos"} de outros ministérios.
          </p>
        </div>
      )}

      {leitura.dadosInsuficientes && !comparaCpa && (
        <p className="border-t border-line pt-3 text-caption text-ink-3">
          Com apenas {leitura.eventos} {leitura.eventos === 1 ? "evento publicado" : "eventos publicados"}, ainda
          não há base para comparar evolução ou eficiência.
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   RANKING DE EFICIÊNCIA DA CARTEIRA (painel da Comunicação)
   ========================================================================= */

export function RankingEficiencia({
  ranking,
  nomePorMinisterio,
  limite = 6,
}: {
  ranking: { ministryId: string; eventos: number; investimento: number; cpaMediano: number | null }[];
  nomePorMinisterio: Map<string, string>;
  limite?: number;
}) {
  if (ranking.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Icon.Target className="h-4 w-4" />}
        title="Sem custo por resultado calculável"
        description="O ranking aparece quando houver campanhas com investimento e conversão rastreada."
      />
    );
  }

  const visiveis = ranking.slice(0, limite);
  const pior = Math.max(...ranking.map((r) => r.cpaMediano ?? 0), 1);

  return (
    <div className="divide-y divide-line">
      {visiveis.map((r, i) => {
        const pct = ((r.cpaMediano ?? 0) / pior) * 100;
        return (
          <div key={r.ministryId} className="py-2.5 first:pt-0 last:pb-0">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono text-[0.625rem] tabular-nums text-ink-3">{i + 1}</span>
                <span className="min-w-0 truncate text-small text-ink">
                  {nomePorMinisterio.get(r.ministryId) ?? "Ministério"}
                </span>
                {i === 0 && (
                  <Badge tone="success" size="sm" className="shrink-0">
                    mais eficiente
                  </Badge>
                )}
              </span>
              <span className="shrink-0 text-small font-medium tabular-nums text-ink">
                {formatMoney(r.cpaMediano)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Barra em tom neutro pra TODOS. Colorir a primeira de verde
                  criava uma leitura contraditória: o comprimento codifica
                  CUSTO (mais longa = pior), então uma barra longa e verde
                  dizia "muito" e "bom" ao mesmo tempo. Quem é o melhor
                  fica marcado pelo selo ao lado do nome, não pela cor da
                  barra. */}
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-soft">
                <div
                  className="h-full origin-left rounded-full bg-line-strong animate-bar-grow"
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-[0.625rem] text-ink-3">
                {r.eventos} {r.eventos === 1 ? "evento" : "eventos"}
              </span>
            </div>
          </div>
        );
      })}

      {ranking.length > limite && (
        <p className="pt-2.5 text-caption text-ink-3">
          Mostrando os {limite} mais eficientes de {ranking.length} ministérios com custo por resultado calculável.
        </p>
      )}
      <p className="pt-2.5 text-caption text-ink-3">
        A barra mostra o custo relativo ao ministério mais caro — <strong className="font-medium text-ink-2">barra
        menor é melhor</strong>.
        Mediana, não média, para um evento atípico não distorcer o ministério inteiro.
      </p>
    </div>
  );
}

export function VariacaoBadge({
  valor,
  invertido = false,
  rotulo,
}: {
  valor: number | null;
  invertido?: boolean;
  rotulo: string;
}) {
  if (valor == null || !Number.isFinite(valor)) return null;

  const estavel = Math.abs(valor) < 1;
  const subiu = valor > 0;
  const bom = invertido ? !subiu : subiu;

  return (
    <Badge
      tone={estavel ? "neutral" : bom ? "success" : "danger"}
      size="sm"
      icon={
        estavel ? (
          <Icon.Flat className="h-3 w-3" />
        ) : subiu ? (
          <Icon.TrendingUp className="h-3 w-3" />
        ) : (
          <Icon.TrendingDown className="h-3 w-3" />
        )
      }
    >
      {estavel ? "estável" : `${subiu ? "+" : "−"}${Math.abs(valor).toFixed(0)}%`} {rotulo}
    </Badge>
  );
}
