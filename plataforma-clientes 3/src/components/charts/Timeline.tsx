"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/components/ui";
import { formatarDiaMes, formatarMesCurto } from "@/lib/dates";

/* =========================================================================
   LINHA DO TEMPO DE CAMPANHAS
   -------------------------------------------------------------------------
   A pergunta que a aba Campanhas não respondia: QUANDO é o quê. A lista
   mostrava "27 de set. de 26 — 21 de nov. de 26" como texto em cada card,
   e descobrir que duas campanhas se sobrepõem exigia ler todas e montar o
   calendário de cabeça.

   Forma: barras horizontais sobre um eixo de tempo. É a forma certa para
   DURAÇÃO — o comprimento é o período e a posição é quando. Nenhum outro
   gráfico mostra sobreposição de graça.

   Cor: pela SAÚDE da campanha, que é paleta de estado (reservada, nunca
   reaproveitada como "série 4"). Estado nunca viaja só na cor: cada barra
   carrega o nome ao lado e o badge de saúde na lista logo abaixo.

   O que este gráfico NÃO faz: inventar datas. Campanha sem nenhuma data
   fica fora do eixo e aparece contada à parte — some da linha do tempo,
   não vira uma barra de tamanho arbitrário.
   ========================================================================= */

export type ItemLinhaDoTempo = {
  id: string;
  nome: string;
  inicio: string | null;
  termino: string | null;
  /** Marco pontual dentro do período (a data do evento). */
  marco: string | null;
  saude: string;
  saudeLabel: string;
  href: string;
};

const COR_SAUDE: Record<string, string> = {
  no_caminho: "rgb(var(--success))",
  atencao: "rgb(var(--warning))",
  critica: "rgb(var(--danger))",
  pausada: "rgb(var(--stage-parada))",
  concluida: "rgb(var(--info))",
};

function diaDoAno(d: string): number {
  return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000;
}

function mesesEntre(inicio: number, fim: number): { chave: string; pos: number }[] {
  const marcas: { chave: string; pos: number }[] = [];
  const d = new Date(inicio * 86400000);
  let ano = d.getUTCFullYear();
  let mes = d.getUTCMonth();
  // Começa no primeiro dia do mês seguinte ao início, para a primeira
  // marca não colar na borda esquerda.
  for (let i = 0; i < 60; i++) {
    const pos = Date.UTC(ano, mes, 1) / 86400000;
    if (pos > inicio && pos < fim) marcas.push({ chave: `${ano}-${String(mes + 1).padStart(2, "0")}`, pos });
    if (pos > fim) break;
    mes += 1;
    if (mes > 11) { mes = 0; ano += 1; }
  }
  return marcas;
}

export function Timeline({
  itens,
  hoje,
  className,
}: {
  itens: ItemLinhaDoTempo[];
  /** "YYYY-MM-DD" em Brasília, vindo do servidor — o marcador de hoje não
   *  pode sair do relógio do navegador ou ele diverge do resto da tela. */
  hoje: string;
  className?: string;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);

  const dados = useMemo(() => {
    const comData = itens
      .map((i) => {
        // Campanha com só uma ponta vira um período de um dia ancorado
        // nela — não uma barra inventada até "hoje".
        const inicio = i.inicio ?? i.marco ?? i.termino;
        const termino = i.termino ?? i.marco ?? i.inicio;
        if (!inicio || !termino) return null;
        const a = diaDoAno(inicio);
        const b = diaDoAno(termino);
        return { ...i, de: Math.min(a, b), ate: Math.max(a, b), inicioIso: inicio, terminoIso: termino };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null)
      .sort((a, b) => a.de - b.de);

    if (comData.length === 0) return null;

    const hojeDia = diaDoAno(hoje);
    const min = Math.min(...comData.map((i) => i.de), hojeDia);
    const max = Math.max(...comData.map((i) => i.ate), hojeDia);
    // Uma folga de 4% em cada ponta para a barra da primeira e da última
    // campanha não encostar na borda.
    const folga = Math.max(4, (max - min) * 0.04);
    const de = min - folga;
    const ate = max + folga;
    const span = ate - de || 1;

    return {
      itens: comData,
      de,
      span,
      hojePct: ((hojeDia - de) / span) * 100,
      meses: mesesEntre(de, ate).map((m) => ({ ...m, pct: ((m.pos - de) / span) * 100 })),
    };
  }, [itens, hoje]);

  const semData = itens.length - (dados?.itens.length ?? 0);

  if (!dados) {
    return (
      <p className="py-6 text-center text-small text-ink-3">
        Nenhuma campanha tem data cadastrada — sem datas não há linha do tempo.
      </p>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="relative mt-4" style={{ "--col-nome": "clamp(5rem, 22%, 12rem)" } as React.CSSProperties}>
        {/* Eixo: marcas de mês ao fundo, recuadas — só na área do gráfico,
            nunca sob a coluna de nomes. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0"
          style={{ left: "calc(var(--col-nome) + 0.75rem)" }}
        >
          {dados.meses.map((m) => (
            <div
              key={m.chave}
              className="absolute inset-y-0 w-px bg-line"
              style={{ left: `${m.pct}%` }}
            />
          ))}
          {/* Hoje: a única linha com cor, porque é a única referência que
              o leitor traz de fora do gráfico. A etiqueta fica no TOPO da
              própria linha, e não no eixo de meses lá embaixo — ali ela
              caía por cima do nome do mês vizinho sempre que a data estava
              perto de uma virada ("HOJEUT/26"). */}
          {dados.hojePct >= 0 && dados.hojePct <= 100 && (
            <div className="absolute inset-y-0" style={{ left: `${dados.hojePct}%` }}>
              <div className="h-full w-px bg-brand-500/70" />
              <span className="absolute -top-4 left-0 -translate-x-1/2 font-mono text-[0.625rem] uppercase tracking-[0.06em] text-brand-600">
                hoje
              </span>
            </div>
          )}
        </div>

        <ul className="relative space-y-1.5">
          {dados.itens.map((i) => {
            const esquerda = ((i.de - dados.de) / dados.span) * 100;
            const largura = Math.max(((i.ate - i.de) / dados.span) * 100, 0.8);
            const marcoPct = i.marco ? ((diaDoAno(i.marco) - dados.de) / dados.span) * 100 : null;
            const cor = COR_SAUDE[i.saude] ?? "rgb(var(--ink-3))";
            const destacado = ativo === i.id;

            return (
              <li key={i.id}>
                <Link
                  href={i.href}
                  onMouseEnter={() => setAtivo(i.id)}
                  onMouseLeave={() => setAtivo(null)}
                  onFocus={() => setAtivo(i.id)}
                  onBlur={() => setAtivo(null)}
                  className="group grid h-7 grid-cols-[var(--col-nome)_1fr] items-center gap-3 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {/* Nome em coluna fixa, como eixo categórico. A primeira
                      versão ancorava o rótulo na própria barra e o texto
                      escapava do painel quando a barra ficava perto de uma
                      das bordas. Coluna fixa não tem esse problema, e ainda
                      deixa os nomes alinhados para leitura de cima a baixo. */}
                  <span
                    className={cn(
                      "truncate text-right text-caption transition-colors duration-120",
                      destacado ? "text-ink" : "text-ink-2"
                    )}
                  >
                    {i.nome}
                  </span>

                  <span className="relative block h-full">
                    <span
                      className={cn(
                        "absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full transition-[height,opacity] duration-120 ease-snap",
                        destacado ? "h-3.5" : "opacity-85"
                      )}
                      style={{ left: `${esquerda}%`, width: `${largura}%`, backgroundColor: cor }}
                    />
                    {/* Marco pontual (data do evento): um anel na cor da
                        superfície separa o ponto da barra quando se sobrepõem. */}
                    {marcoPct != null && (
                      <span
                        className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                        style={{ left: `${marcoPct}%`, backgroundColor: cor }}
                      />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Rótulos de mês embaixo, alinhados às marcas. */}
      <div
        className="relative mt-2 h-4 border-t border-line"
        style={{ marginLeft: "calc(clamp(5rem, 22%, 12rem) + 0.75rem)" } as React.CSSProperties}
      >
        {dados.meses.map((m) => (
          <span
            key={m.chave}
            className="absolute top-1 -translate-x-1/2 font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-3"
            style={{ left: `${m.pct}%` }}
          >
            {formatarMesCurto(m.chave)}
          </span>
        ))}

      </div>

      {ativo && (
        <p className="mt-3 text-caption text-ink-2">
          {(() => {
            const i = dados.itens.find((x) => x.id === ativo);
            if (!i) return null;
            return (
              <>
                <span className="font-medium text-ink">{i.nome}</span> · {i.saudeLabel} ·{" "}
                {formatarDiaMes(i.inicioIso)} a {formatarDiaMes(i.terminoIso)}
                {i.marco && <> · evento em {formatarDiaMes(i.marco)}</>}
              </>
            );
          })()}
        </p>
      )}

      {semData > 0 && (
        <p className="mt-3 text-caption text-ink-3">
          {semData} {semData === 1 ? "campanha sem data cadastrada não aparece" : "campanhas sem data cadastrada não aparecem"} na linha do tempo.
        </p>
      )}
    </div>
  );
}
