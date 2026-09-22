"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { normalizar } from "@/lib/texto";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/app/dashboard/search-actions";
import { NAV_GROUPS } from "@/lib/navigation";
import { cn, Icon } from "@/components/ui";

/* =========================================================================
   COMMAND PALETTE (⌘K)
   -------------------------------------------------------------------------
   O recurso já existia e era bom — o problema era descoberta: o gatilho
   ficava escondido como um botão dentro da sidebar escura. Agora ele mora
   no header, onde a busca é procurada.

   Duas mudanças de conteúdo:
   - Sem digitar nada, a paleta lista as PÁGINAS do produto. Vira atalho
     de navegação, não só busca de registro — é o caminho mais rápido pra
     quem já conhece o sistema, e uma vitrine de funcionalidades pra quem
     não conhece (o "descoberta de funcionalidades" da auditoria).
   - Resultados agrupados por tipo com ícone, em vez de lista achatada.
   ========================================================================= */

const TYPE_META: Record<SearchResult["type"], { label: string; Ico: typeof Icon.Layers }> = {
  demanda: { label: "Demanda", Ico: Icon.ListChecks },
  campanha: { label: "Campanha", Ico: Icon.Megaphone },
};

type PageEntry = { href: string; label: string; icon: string; group: string; description?: string };

export function CommandPalette({
  open,
  onOpenChange,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  const pages = useMemo<PageEntry[]>(
    () =>
      NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin).flatMap((g) =>
        g.items.map((i) => ({ href: i.href, label: i.label, icon: i.icon, group: g.label, description: i.description }))
      ),
    [isAdmin]
  );

  const term = query.trim();

  const matchedPages = useMemo(() => {
    if (term.length === 0) return pages;
    const norm = normalizar(term);
    return pages.filter((p) =>
      normalizar(`${p.label} ${p.description ?? ""}`).includes(norm)
    );
  }, [pages, term]);

  // Lista achatada na ORDEM DE EXIBIÇÃO — é sobre ela que as setas e o
  // Enter operam, pra o índice ativo bater com o que está na tela.
  const flat = useMemo(
    () => [
      ...matchedPages.map((p) => ({ kind: "page" as const, item: p })),
      ...results.map((r) => ({ kind: "result" as const, item: r })),
    ],
    [matchedPages, results]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    // Debounce: uma busca por pausa de digitação, não por tecla.
    const timeout = setTimeout(() => {
      startTransition(async () => {
        setResults(await globalSearch(term));
        setActiveIndex(0);
      });
    }, 180);
    return () => clearTimeout(timeout);
  }, [term]);

  // Mantém o item ativo visível ao navegar com as setas.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(flat.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = flat[activeIndex];
      if (entry) go(entry.kind === "page" ? entry.item.href : entry.item.href);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  }

  let cursor = -1;

  return (
    <div
      className="fixed inset-0 z-dialog flex items-start justify-center bg-ink/45 p-4 pt-[12vh] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar no portal"
        className="w-full max-w-xl overflow-hidden rounded-dialog border border-line bg-surface-raised shadow-dialog animate-scale-in"
      >
        <div className="relative border-b border-line">
          <Icon.Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar páginas, demandas e campanhas..."
            aria-label="Buscar"
            className="w-full bg-transparent py-3.5 pl-11 pr-14 text-body-lg text-ink outline-none placeholder:text-ink-3"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-3">
            esc
          </kbd>
        </div>

        <ul ref={listRef} className="max-h-[22rem] overflow-y-auto p-1.5">
          {matchedPages.length > 0 && (
            <>
              <li className="px-2.5 pb-1 pt-2 font-mono text-label uppercase text-ink-3">Ir para</li>
              {matchedPages.map((p) => {
                cursor++;
                const idx = cursor;
                const Ico = (Icon as Record<string, (x: { className?: string }) => JSX.Element>)[p.icon] ?? Icon.Layers;
                return (
                  <li key={p.href}>
                    <button
                      type="button"
                      data-active={idx === activeIndex}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => go(p.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors duration-120",
                        idx === activeIndex ? "bg-neutral-soft" : ""
                      )}
                    >
                      <Ico className="h-4 w-4 shrink-0 text-ink-3" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-small font-medium text-ink">{p.label}</span>
                        {p.description && <span className="block truncate text-caption text-ink-3">{p.description}</span>}
                      </span>
                      <Icon.ArrowRight className={cn("h-3.5 w-3.5 shrink-0 text-ink-3 transition-opacity", idx === activeIndex ? "opacity-100" : "opacity-0")} />
                    </button>
                  </li>
                );
              })}
            </>
          )}

          {term.length >= 2 && (
            <>
              <li className="flex items-center gap-2 px-2.5 pb-1 pt-3 font-mono text-label uppercase text-ink-3">
                Registros
                {isPending && <Icon.Loader className="h-3 w-3 animate-spin" />}
              </li>
              {results.length === 0 && !isPending ? (
                <li className="px-2.5 py-4 text-center text-caption text-ink-3">
                  Nenhuma demanda ou campanha encontrada para “{term}”.
                </li>
              ) : (
                results.map((r) => {
                  cursor++;
                  const idx = cursor;
                  const meta = TYPE_META[r.type];
                  return (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        type="button"
                        data-active={idx === activeIndex}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => go(r.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors duration-120",
                          idx === activeIndex ? "bg-neutral-soft" : ""
                        )}
                      >
                        <meta.Ico className="h-4 w-4 shrink-0 text-ink-3" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-small font-medium text-ink">{r.title}</span>
                          <span className="block truncate font-mono text-[0.625rem] uppercase text-ink-3">
                            {meta.label} · {r.subtitle}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </>
          )}

          {term.length === 1 && (
            <li className="px-2.5 py-4 text-center text-caption text-ink-3">
              Digite pelo menos 2 letras para buscar registros.
            </li>
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-line bg-surface-sunken px-4 py-2 font-mono text-[0.625rem] uppercase text-ink-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line px-1">↑↓</kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line px-1">↵</kbd> abrir
          </span>
        </div>
      </div>
    </div>
  );
}
