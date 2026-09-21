/* =========================================================================
   ARQUITETURA DE NAVEGAÇÃO
   -------------------------------------------------------------------------
   Fonte única da verdade pra sidebar, breadcrumb, título do header e
   busca. Antes o menu era uma lista plana de cinco itens sem ícone e sem
   agrupamento, e o breadcrumb não existia.

   O agrupamento sai da arquitetura REAL do produto, não de um template:

     VISÃO GERAL   — onde a pessoa começa e vê o estado das coisas
     GESTÃO        — os objetos que ela acompanha (demandas, eventos, arquivos)
     ADMINISTRAÇÃO — só Comunicação: opera a carteira inteira

   "Meu acesso" e "Sair" saíram do menu e foram pro menu de usuário no
   header, que é onde todo produto B2B põe conta e sessão.
   ========================================================================= */

export type NavItem = {
  href: string;
  label: string;
  /** Nome da chave em `Icon` (components/ui/icons) — string pra esse
   *  arquivo continuar sem JSX e poder ser importado do servidor. */
  icon: string;
  /** Rótulo curto pro breadcrumb, quando o do menu for longo demais. */
  short?: string;
  description?: string;
  /** Casamento exato (a raiz de uma seção) x por prefixo (as filhas). */
  exact?: boolean;
  adminOnly?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      {
        href: "/dashboard",
        label: "Início",
        icon: "Home",
        exact: true,
        description: "Resumo do ministério: o que precisa de atenção agora",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        href: "/dashboard/campanhas",
        label: "Campanhas e eventos",
        short: "Campanhas",
        icon: "Megaphone",
        description: "Cada evento com investimento, entregas e resultado",
      },
      {
        href: "/dashboard/demandas",
        label: "Demandas",
        icon: "ListChecks",
        description: "Solicitações e entregas da Comunicação",
      },
      {
        href: "/dashboard/entregas",
        label: "Arquivos",
        icon: "Folder",
        description: "Biblioteca de peças, materiais e links finais",
      },
    ],
  },
  {
    label: "Administração",
    adminOnly: true,
    items: [
      {
        href: "/dashboard/admin",
        label: "Painel geral",
        icon: "BarChart",
        exact: true,
        adminOnly: true,
        description: "Carteira inteira: todos os ministérios de uma vez",
      },
      {
        href: "/dashboard/admin/campanhas-pendentes",
        label: "Campanhas ativas",
        icon: "Layers",
        adminOnly: true,
        description: "Publicar, ocultar e organizar campanhas em pastas",
      },
      {
        href: "/dashboard/admin/ministerios",
        label: "Ministérios",
        icon: "Building",
        adminOnly: true,
        description: "Cadastro, capa, cor e identidade de cada ministério",
      },
      {
        href: "/dashboard/admin/asana",
        label: "Integração Asana",
        short: "Asana",
        icon: "Refresh",
        adminOnly: true,
        description: "O que cada coluna dos quadros significa no portal",
      },
      {
        href: "/dashboard/admin/usuarios",
        label: "Usuários e acessos",
        short: "Usuários",
        icon: "Users",
        adminOnly: true,
        description: "Contas, papéis e vínculos",
      },
    ],
  },
];

/** Todos os itens numa lista só — pra resolver título e breadcrumb. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isNavItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Item de menu que "governa" a rota atual — o mais específico que casa.
 *  Ordenar por comprimento evita /dashboard ganhar de
 *  /dashboard/admin/usuarios. */
export function findNavItem(pathname: string | null): NavItem | null {
  if (!pathname) return null;
  const matches = ALL_NAV_ITEMS.filter((i) => isNavItemActive(i, pathname));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

/** Trilha do header. `detailLabel` é o nome do registro aberto (a campanha,
 *  a demanda) — quem sabe disso é a página, então ela passa via
 *  <PageHeader breadcrumb=...> quando precisa. */
export function buildBreadcrumb(pathname: string | null): { label: string; href?: string }[] {
  const item = findNavItem(pathname);
  if (!item) return [];

  const trail: { label: string; href?: string }[] = [];
  const group = NAV_GROUPS.find((g) => g.items.some((i) => i.href === item.href));

  if (group && group.items.length > 1) trail.push({ label: group.label });
  if (item.href !== "/dashboard") trail.push({ label: "Início", href: "/dashboard" });

  trail.push({ label: item.short ?? item.label, href: item.href });
  return trail;
}
