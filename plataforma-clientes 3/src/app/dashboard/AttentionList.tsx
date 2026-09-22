"use client";

import Link from "next/link";
import { Badge, Icon, cn } from "@/components/ui";

/* =========================================================================
   PRECISA DE ATENÇÃO
   -------------------------------------------------------------------------
   O bloco mais acionável do Início — e o que não existia antes. O painel
   anterior mostrava contagens, mas nunca dizia QUAL item estava travado
   nem levava até ele; o usuário tinha que sair, abrir a lista e procurar.

   Três grupos, em ordem de urgência: prazo vencido, esperando o
   ministério, campanha em risco. Cada linha é um link direto pro registro.
   Quando o grupo tem mais itens do que cabe, o rodapé leva pra lista
   filtrada — nada some sem deixar saída.
   ========================================================================= */

type Item = { id: string; titulo: string; meta: string; critica?: boolean };

function Group({
  icon,
  label,
  tone,
  items,
  total,
  hrefOf,
  moreHref,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "danger" | "warning";
  items: Item[];
  total: number;
  hrefOf: (item: Item) => string;
  moreHref: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-b border-line last:border-0">
      <div className="flex items-center gap-2 px-4 pb-1.5 pt-3 sm:px-5">
        <span className={cn("shrink-0", tone === "danger" ? "text-danger" : "text-warning")}>{icon}</span>
        <p className="font-mono text-label uppercase text-ink-3">{label}</p>
        <Badge tone={tone} size="sm" className="ml-auto">
          {total}
        </Badge>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={hrefOf(item)}
              className="group flex items-center gap-2 px-4 py-2 transition-colors duration-120 hover:bg-surface-sunken sm:px-5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small text-ink">{item.titulo}</span>
                <span className={cn("block truncate text-caption", tone === "danger" ? "text-danger" : "text-ink-3")}>
                  {item.meta}
                </span>
              </span>
              <Icon.ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity duration-120 group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
      {total > items.length && (
        <Link
          href={moreHref}
          className="block px-4 pb-2.5 pt-1 text-caption text-brand-600 underline-offset-4 hover:underline sm:px-5"
        >
          + {total - items.length} {total - items.length === 1 ? "outro item" : "outros itens"}
        </Link>
      )}
    </div>
  );
}

export function AttentionList({
  atrasadas,
  atrasadasTotal,
  aguardando,
  aguardandoTotal,
  campanhas,
  campanhasTotal,
}: {
  atrasadas: Item[];
  atrasadasTotal: number;
  aguardando: Item[];
  aguardandoTotal: number;
  campanhas: Item[];
  campanhasTotal: number;
}) {
  // Sem teto de altura. Havia um `max-h-[22rem] overflow-y-auto` aqui: a
  // lista rolava por dentro do painel, sem barra visível (o Chromium usa
  // barra sobreposta) e cortando o último item NO MEIO DA LINHA. Lia-se
  // como defeito de renderização, e quem não descobria a rolagem não via
  // o resto. O conteúdo já é limitado na origem — no máximo quatro itens
  // por grupo, com link para o resto —, então o painel pode simplesmente
  // ter a altura do que mostra.
  return (
    <div>
      <Group
        icon={<Icon.AlertTriangle className="h-3.5 w-3.5" />}
        label="Prazo vencido"
        tone="danger"
        items={atrasadas}
        total={atrasadasTotal}
        hrefOf={(i) => `/dashboard/demandas/${i.id}`}
        moreHref="/dashboard/demandas"
      />
      <Group
        icon={<Icon.Clock className="h-3.5 w-3.5" />}
        label="Esperando o ministério"
        tone="warning"
        items={aguardando}
        total={aguardandoTotal}
        hrefOf={(i) => `/dashboard/demandas/${i.id}`}
        moreHref="/dashboard/demandas"
      />
      <Group
        icon={<Icon.Megaphone className="h-3.5 w-3.5" />}
        label="Campanhas em risco"
        tone="warning"
        items={campanhas}
        total={campanhasTotal}
        hrefOf={(i) => `/dashboard/campanhas/${i.id}`}
        moreHref="/dashboard/campanhas"
      />
    </div>
  );
}
