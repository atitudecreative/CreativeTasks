"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/app/dashboard/search-actions";

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  demanda: "Demanda",
  campanha: "Campanha",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Atalho global: Cmd+K (Mac) ou Ctrl+K (Windows/Linux) abre de qualquer
  // tela do dashboard, sem precisar clicar no botão.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      // foco só depois do modal montar
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const found = await globalSearch(query);
        setResults(found);
        setActiveIndex(0);
      });
    }, 200); // debounce simples pra não disparar uma busca por tecla
    return () => clearTimeout(timeout);
  }, [query]);

  function go(result: SearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center justify-between rounded-lg border border-walnut-700 bg-walnut-800/60 px-3 py-2 text-left text-sm text-walnut-300 transition hover:bg-walnut-800"
      >
        <span>Buscar...</span>
        <span className="rounded border border-walnut-600 px-1.5 py-0.5 text-[10px] text-walnut-400">⌘K</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Buscar demandas ou campanhas..."
              className="w-full border-b border-neutral-200 px-4 py-3 text-sm outline-none"
            />

            <div className="max-h-80 overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-4 py-6 text-center text-xs text-neutral-400">
                  Digite pelo menos 2 letras pra buscar.
                </p>
              ) : isPending ? (
                <p className="px-4 py-6 text-center text-xs text-neutral-400">Buscando...</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-neutral-400">Nada encontrado.</p>
              ) : (
                <ul>
                  {results.map((r, i) => (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => go(r)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm ${
                          i === activeIndex ? "bg-brand-50" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">{r.title}</span>
                        <span className="shrink-0 text-xs text-neutral-400">
                          {TYPE_LABEL[r.type]} · {r.subtitle}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
