"use client";

import { useEffect, useState } from "react";
import { cn, Button, Icon, useToast } from "@/components/ui";
import type { MetaAd } from "@/lib/data/metaAds";

/* =========================================================================
   NAVEGAÇÃO E AÇÕES DO RELATÓRIO
   -------------------------------------------------------------------------
   Por que âncoras e não abas (a versão anterior usava abas):

   Esta tela é o artefato que o cliente recebe. Aba ESCONDE conteúdo — e
   conteúdo escondido não é impresso, não é encontrado pelo Ctrl+F, e não
   é lido por quem só quer rolar o relatório de cima a baixo. A tela tinha
   um botão "Imprimir / PDF" ao lado de abas que sonegavam três quartos
   do conteúdo da impressão.

   Com âncoras: tudo existe na página, o PDF sai completo, a rolagem conta
   a história na ordem certa, e a navegação continua sendo um clique.
   O indicador de seção ativa acompanha a rolagem via IntersectionObserver.
   ========================================================================= */

export type ReportSection = { id: string; label: string; icon: keyof typeof Icon };

export function ReportNav({
  sections,
  ads,
  campaignNome,
}: {
  sections: ReportSection[];
  ads: MetaAd[];
  campaignNome: string;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const toast = useToast();

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (nodes.length === 0) return;

    // rootMargin puxa a "linha de leitura" pro terço superior da janela:
    // sem isso a seção só é marcada como ativa quando já saiu de vista.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-88px 0px -62% 0px", threshold: 0 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [sections]);

  function exportCsv() {
    if (ads.length === 0) {
      toast.info({ title: "Nada para exportar", description: "Esta campanha ainda não tem criativos sincronizados." });
      return;
    }
    const header = ["Criativo", "Investido", "Impressões", "Cliques", "CTR", "CPC", "CPM", "Resultados"];
    const lines = ads.map((ad) =>
      [ad.nome, ad.investimento ?? "", ad.impressoes ?? "", ad.cliques ?? "", ad.ctr ?? "", ad.cpc ?? "", ad.cpm ?? "", ad.vendas ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    );
    // BOM na frente: sem ele o Excel em pt-BR abre o arquivo com acento
    // quebrado, que é o primeiro lugar onde um relatório perde crédito.
    const csv = "﻿" + [header.join(";"), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meta-ads-${campaignNome.trim().toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success({ title: "Planilha baixada", description: `${ads.length} criativos exportados em CSV.` });
  }

  return (
    <div
      data-print="hide"
      className="signal-blur sticky top-header z-20 -mx-4 mb-5 border-y border-line bg-canvas/85 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="flex items-center gap-2">
        <nav aria-label="Seções do relatório" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex items-center gap-0.5">
            {sections.map((s) => {
              const Ico = Icon[s.icon] as (p: { className?: string }) => JSX.Element;
              const isActive = active === s.id;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 py-1.5 text-caption font-medium",
                      "transition-colors duration-120",
                      isActive ? "bg-ink text-ink-inverse" : "text-ink-3 hover:bg-neutral-soft hover:text-ink"
                    )}
                  >
                    <Ico className="h-3.5 w-3.5" />
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          {ads.length > 0 && (
            <Button size="sm" variant="ghost" onClick={exportCsv} iconLeft={<Icon.Download className="h-3.5 w-3.5" />}>
              <span className="hidden sm:inline">CSV</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.print()}
            iconLeft={<Icon.Printer className="h-3.5 w-3.5" />}
          >
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
