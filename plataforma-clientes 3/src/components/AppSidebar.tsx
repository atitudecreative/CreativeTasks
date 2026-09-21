"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, Icon, Tooltip } from "@/components/ui";
import { NAV_GROUPS, isNavItemActive, type NavItem } from "@/lib/navigation";

/* =========================================================================
   SIDEBAR
   -------------------------------------------------------------------------
   Antes: <aside className="w-[300px]"> dentro de um flex, sem nenhum
   breakpoint — no celular ela comia a tela inteira e não havia como
   navegar. Agora o MESMO componente serve três contextos:

     desktop expandido  — 264px, rótulo + ícone + agrupamento
     desktop recolhido  — 68px, só ícone, rótulo vira tooltip
     celular            — drawer por cima, fechado por padrão

   A capa do ministério continua sendo suportada (era um recurso existente
   e bonito), mas agora com um véu de legibilidade MAIOR e um gradiente que
   escurece pro rodapé — antes o texto sumia em capa clara.
   ========================================================================= */

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isNavItemActive(item, pathname);
  const Ico = (Icon as Record<string, (p: { className?: string }) => JSX.Element>)[item.icon] ?? Icon.Layers;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-control text-small font-medium",
        "transition-[background-color,color] duration-120 ease-snap",
        collapsed ? "h-10 w-10 justify-center" : "h-10 gap-2.5 px-2.5",
        active
          ? "bg-white/[0.14] text-white"
          : "text-white/65 hover:bg-white/[0.07] hover:text-white"
      )}
    >
      {/* Marcador de item ativo: uma barra na borda esquerda, não um bloco
          laranja inteiro. Lê como "você está aqui" sem gritar, e mantém a
          cor de marca como acento e não como fundo. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500 transition-all duration-180 ease-snap",
          active ? "h-5 opacity-100" : "h-0 opacity-0"
        )}
      />
      <Ico className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  // Recolhida, o rótulo vira tooltip — senão os ícones sozinhos viram
  // adivinhação.
  return collapsed ? (
    <Tooltip content={item.label} side="bottom" className="block">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function AppSidebar({
  logoUrl,
  ministryName,
  ministryCapa,
  roleLabel,
  isAdmin,
  collapsed,
  onToggleCollapse,
  onNavigate,
  switcher,
  userSlot,
}: {
  logoUrl: string | null;
  ministryName: string;
  ministryCapa: string | null;
  roleLabel: string;
  isAdmin: boolean;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  switcher?: React.ReactNode;
  userSlot?: React.ReactNode;
}) {
  const groups = NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin);

  return (
    <div
      data-app-sidebar=""
      className={cn(
        "relative flex h-full flex-col overflow-hidden bg-walnut-900",
        "transition-[width] duration-240 ease-snap"
      )}
    >
      {/* Capa do ministério como textura de fundo. O gradiente é preto
          neutro (não a cor do tema) pra não tingir a foto, e vai de 55%
          no topo a 88% embaixo — é o que mantém logo, menu e rodapé
          legíveis mesmo com capa clara. */}
      {ministryCapa && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.72) 45%, rgba(0,0,0,0.88)), url(${ministryCapa})`,
          }}
        />
      )}

      <div className="relative flex h-full min-h-0 flex-col">
        {/* ---------- Marca ---------- */}
        <div className={cn("flex items-center gap-2 px-3 pb-1 pt-4", collapsed && "justify-center px-2")}>
          <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-2.5 rounded-control p-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo vem de upload dinâmico (site_theme.logo_url) */}
            <img
              src={logoUrl ?? "/logo-dark-bg.png"}
              alt="Atitude Creative"
              className={cn("w-auto shrink-0 object-contain", collapsed ? "h-7" : "h-9")}
            />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate font-mono text-label uppercase text-white/55">Portal</span>
                <span className="block truncate text-caption font-semibold text-white/90">Ministérios</span>
              </span>
            )}
          </Link>

          {onToggleCollapse && !collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="ml-auto hidden h-8 w-8 shrink-0 items-center justify-center rounded-control text-white/45 transition hover:bg-white/10 hover:text-white lg:flex"
            >
              <Icon.ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ---------- Seletor de ministério ---------- */}
        {!collapsed && switcher && <div className="px-3 pb-1 pt-3">{switcher}</div>}

        {/* ---------- Navegação ---------- */}
        <nav
          data-app-nav=""
          aria-label="Navegação principal"
          className={cn("min-h-0 flex-1 overflow-y-auto pb-4 pt-3", collapsed ? "px-2" : "px-3")}
        >
          {groups.map((group, gi) => (
            <div key={group.label} className={cn(gi > 0 && (collapsed ? "mt-3 border-t border-white/10 pt-3" : "mt-5"))}>
              {!collapsed && (
                <p className="mb-1.5 px-2.5 font-mono text-label uppercase text-white/35">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ---------- Rodapé: contexto ativo + conta ---------- */}
        <div className={cn("shrink-0 border-t border-white/10", collapsed ? "p-2" : "p-3")}>
          {!collapsed && (
            <div className="mb-2 px-1">
              <p className="truncate text-caption font-medium text-white/90">{ministryName}</p>
              <p className="truncate font-mono text-label uppercase text-white/40">{roleLabel}</p>
            </div>
          )}
          {collapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expandir menu"
              title="Expandir menu"
              className="mb-1 hidden h-10 w-10 items-center justify-center rounded-control text-white/45 transition hover:bg-white/10 hover:text-white lg:flex"
            >
              <Icon.ChevronsRight className="h-4 w-4" />
            </button>
          )}
          {userSlot}
        </div>
      </div>
    </div>
  );
}
