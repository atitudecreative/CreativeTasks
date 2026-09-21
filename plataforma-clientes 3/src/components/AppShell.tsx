"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  cn, Icon, Button, IconButton, Avatar, Breadcrumb,
  DropdownMenu, MenuItem, MenuLabel, MenuSeparator,
} from "@/components/ui";
import { AppSidebar } from "./AppSidebar";
import { MinistrySwitcher } from "./MinistrySwitcher";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
import { buildBreadcrumb, findNavItem } from "@/lib/navigation";

const SIDEBAR_COLLAPSED_KEY = "portal-sidebar-collapsed";

/* =========================================================================
   APP SHELL
   -------------------------------------------------------------------------
   Casca única do produto: sidebar + header + área de conteúdo.

   Comportamento por breakpoint (a auditoria achou 57 prefixos responsivos
   no projeto inteiro — nenhum deles na navegação):

     < lg   sidebar é drawer, fechada por padrão, aberta pelo botão do
            header; fecha sozinha ao navegar e no Esc.
     >= lg  sidebar fixa, recolhível pra 68px; a escolha fica no
            localStorage, então o usuário não precisa repetir a cada visita.

   O header é sticky com fundo translúcido — aqui o blur é funcional: o
   conteúdo rola por baixo e o título precisa continuar legível.
   ========================================================================= */

export function AppShell({
  children,
  logoUrl,
  ministryName,
  ministryCapa,
  roleLabel,
  userName,
  userEmail,
  isAdmin,
  switcherOptions,
  currentMinistryId,
  signOutAction,
}: {
  children: React.ReactNode;
  logoUrl: string | null;
  ministryName: string;
  ministryCapa: string | null;
  roleLabel: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  switcherOptions: { id: string; name: string }[];
  currentMinistryId: string;
  signOutAction: () => void;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Preferência de sidebar recolhida — lida depois de montar pra não
  // divergir entre servidor e cliente na hidratação.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* storage bloqueado: fica expandida, que é o padrão */
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignora */
      }
      return next;
    });
  }

  // Navegou: fecha o drawer. Sem isso o usuário de celular clica num item
  // e continua olhando pro menu.
  useEffect(() => setMobileOpen(false), [pathname]);

  // Trava a rolagem do fundo enquanto o drawer está aberto.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Atalhos globais: ⌘K / Ctrl+K abre a busca; Esc fecha o drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "Escape") {
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navItem = findNavItem(pathname);
  const crumbs = buildBreadcrumb(pathname);

  const userMenu = (
    <DropdownMenu
      align="start"
      trigger={({ toggle, ref, open }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors duration-120",
            "text-white/70 hover:bg-white/[0.08] hover:text-white"
          )}
        >
          <Avatar name={userName} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-caption font-medium text-white">{userName}</span>
            <span className="block truncate text-[0.6875rem] text-white/45">{userEmail}</span>
          </span>
          <Icon.ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      )}
      className="bottom-full left-0 right-0 top-auto mb-1.5 mt-0"
    >
      <MenuLabel>Conta</MenuLabel>
      <MenuItem href="/dashboard/acesso" icon={<Icon.Shield className="h-4 w-4" />}>
        Meu acesso e papéis
      </MenuItem>
      <MenuSeparator />
      <MenuItem onClick={signOutAction} icon={<Icon.Logout className="h-4 w-4" />} tone="danger">
        Sair da conta
      </MenuItem>
    </DropdownMenu>
  );

  const sidebar = (mobile: boolean) => (
    <AppSidebar
      logoUrl={logoUrl}
      ministryName={ministryName}
      ministryCapa={ministryCapa}
      roleLabel={roleLabel}
      isAdmin={isAdmin}
      collapsed={mobile ? false : collapsed}
      onToggleCollapse={mobile ? undefined : toggleCollapse}
      onNavigate={mobile ? () => setMobileOpen(false) : undefined}
      switcher={<MinistrySwitcher options={switcherOptions} currentId={currentMinistryId} />}
      userSlot={userMenu}
    />
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Pular pro conteúdo — primeiro parada da tabulação. */}
      <a
        href="#conteudo"
        className="signal-skip-link rounded-control bg-ink px-3 py-2 text-small font-medium text-ink-inverse shadow-lg"
      >
        Pular para o conteúdo
      </a>

      {/* ---------------- Sidebar fixa (>= lg) ---------------- */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 lg:block",
          "transition-[width] duration-240 ease-snap",
          collapsed ? "w-[68px]" : "w-[264px]"
        )}
      >
        {sidebar(false)}
      </aside>

      {/* ---------------- Drawer (< lg) ---------------- */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-sidebar flex bg-ink/50 animate-fade-in lg:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="h-full w-[268px] max-w-[84vw] animate-slide-left shadow-xl">{sidebar(true)}</div>
        </div>
      )}

      {/* ---------------- Coluna de conteúdo ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-app-header=""
          className="signal-blur sticky top-0 z-header flex h-header shrink-0 items-center gap-2 border-b border-line bg-canvas/85 px-3 sm:px-5"
        >
          <IconButton label="Abrir menu" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Icon.Menu className="h-4.5 w-4.5" />
          </IconButton>

          {/* Contexto da página: trilha no desktop, título curto no celular
              (a trilha inteira não cabe e viraria reticências). */}
          <div className="min-w-0 flex-1">
            <Breadcrumb items={crumbs} className="hidden sm:block" />
            <p className="truncate text-small font-medium text-ink sm:hidden">{navItem?.label ?? "Portal"}</p>
          </div>

          {/* Busca: campo falso no desktop (abre a paleta), só ícone no
              celular. O atalho fica visível — é assim que se descobre. */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              "hidden h-control items-center gap-2 rounded-control border border-line bg-surface px-2.5 md:flex",
              "text-caption text-ink-3 shadow-xs transition duration-120 hover:border-line-strong hover:text-ink-2"
            )}
          >
            <Icon.Search className="h-3.5 w-3.5" />
            <span className="pr-8">Buscar...</span>
            <kbd className="rounded border border-line px-1 py-0.5 font-mono text-[0.625rem]">⌘K</kbd>
          </button>
          <IconButton label="Buscar" size="sm" className="md:hidden" onClick={() => setPaletteOpen(true)}>
            <Icon.Search className="h-4 w-4" />
          </IconButton>

          <ThemeToggle />
        </header>

        <main id="conteudo" className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-content">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} isAdmin={isAdmin} />
    </div>
  );
}

/* =========================================================================
   PAGE HEADER
   -------------------------------------------------------------------------
   Cabeçalho de página, igual em todas as telas. Antes cada página escrevia
   o próprio <h1> com um tamanho diferente (text-4xl aqui, text-xl ali,
   text-lg acolá) — era a origem da sensação de "cada tela é de um produto".
   ========================================================================= */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Chips de contexto abaixo do título (contagens, período, status). */
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    // Coluna no celular, linha a partir de `sm`. Com flex-wrap simples, o
    // bloco de texto (min-w-0 flex-1) encolhia até uma coluna de ~120px
    // enquanto os botões seguravam a largura deles — o título vinha
    // quebrado palavra por palavra.
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-6",
        className
      )}
    >
      <div className="min-w-0 sm:flex-1">
        {eyebrow && <p className="mb-1.5 font-mono text-label uppercase text-ink-3">{eyebrow}</p>}
        <h1 className="text-h1 text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-body text-ink-2">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && (
        <div data-print="hide" className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export { Button };
