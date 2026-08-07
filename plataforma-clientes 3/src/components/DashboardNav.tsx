"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Início" },
  { href: "/dashboard/demandas", label: "Demandas" },
  { href: "/dashboard/campanhas", label: "Campanhas e eventos" },
  { href: "/dashboard/entregas", label: "Entregas e arquivos" },
  { href: "/dashboard/acesso", label: "Meu acesso" },
];

export function DashboardNav({ showAdminLink }: { showAdminLink: boolean }) {
  const pathname = usePathname();

  const links = showAdminLink
    ? [
        ...LINKS,
        { href: "/dashboard/admin", label: "Painel administrativo" },
        { href: "/dashboard/admin/ministerios", label: "Ministérios (cadastro)" },
        { href: "/dashboard/admin/usuarios", label: "Usuários e acessos" },
      ]
    : LINKS;

  return (
    <nav className="space-y-1 text-sm">
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard" || link.href === "/dashboard/admin"
            ? pathname === link.href
            : pathname?.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive
                ? "block rounded-lg bg-brand-50 px-3 py-2 font-medium text-brand-700"
                : "block rounded-lg px-3 py-2 font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
