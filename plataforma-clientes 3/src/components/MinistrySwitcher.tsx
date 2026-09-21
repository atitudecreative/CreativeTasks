"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setActiveMinistry } from "@/app/dashboard/actions";
import { cn, Icon } from "@/components/ui";

/* =========================================================================
   SELETOR DE MINISTÉRIO (multi-tenant)
   -------------------------------------------------------------------------
   Era um <select> nativo. Funcionava, mas: a Comunicação enxerga a
   carteira INTEIRA, e um select nativo com dezenas de opções é rolagem
   cega — não dá pra digitar pra achar.

   Agora é um combobox com busca, teclado completo (setas, Enter, Esc) e
   iniciais coloridas por ministério, que é o que permite reconhecer o
   tenant ativo de relance. Continua postando no MESMO server action
   (setActiveMinistry), então o cookie e a regra de acesso não mudam.
   ========================================================================= */

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function MinistrySwitcher({
  options,
  currentId,
}: {
  options: { id: string; name: string }[];
  currentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const current = options.find((o) => o.id === currentId);

  const filtered = useMemo(() => {
    const term = query
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    if (!term) return options;
    return options.filter((o) =>
      o.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(term)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);

    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Um ministério só: não existe escolha a fazer, então mostramos só o
  // nome — um seletor de uma opção é ruído.
  if (options.length <= 1) return null;

  function choose(id: string) {
    setOpen(false);
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("ministryId") as HTMLInputElement).value = id;
    form.requestSubmit();
  }

  return (
    <div ref={wrapRef} className="relative">
      <form ref={formRef} action={setActiveMinistry} className="hidden">
        <input type="hidden" name="ministryId" defaultValue={currentId} />
      </form>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-control border border-white/15 bg-white/[0.06] px-2.5 py-2 text-left",
          "transition-colors duration-120 hover:border-white/25 hover:bg-white/10"
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-brand-600 text-[0.625rem] font-semibold text-white">
          {initials(current?.name ?? "?")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[0.625rem] uppercase tracking-[0.08em] text-white/40">Ministério</span>
          <span className="block truncate text-caption font-medium text-white">{current?.name ?? "Selecionar"}</span>
        </span>
        <Icon.ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-white/45 transition-transform duration-180", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-dialog overflow-hidden rounded-card border border-line bg-surface-raised shadow-lg animate-scale-in">
          <div className="relative border-b border-line">
            <Icon.Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && filtered[active]) {
                  e.preventDefault();
                  choose(filtered[active].id);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Buscar ministério..."
              className="w-full bg-transparent py-2 pl-8 pr-2.5 text-small text-ink outline-none placeholder:text-ink-3"
            />
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-2.5 py-6 text-center text-caption text-ink-3">Nenhum ministério encontrado.</li>
            ) : (
              filtered.map((o, i) => {
                const selected = o.id === currentId;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(o.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-small transition-colors duration-120",
                        i === active ? "bg-neutral-soft text-ink" : "text-ink-2"
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-neutral-soft text-[0.625rem] font-semibold text-ink-2">
                        {initials(o.name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{o.name}</span>
                      {selected && <Icon.Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
