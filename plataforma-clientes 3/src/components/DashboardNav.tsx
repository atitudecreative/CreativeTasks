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

const ADMIN_LINKS = [
  { href: "/dashboard/admin", label: "Painel administrativo" },
  { href: "/dashboard/admin/campanhas-pendentes", label: "Campanhas ativas" },
  { href: "/dashboard/admin/ministerios", label: "Ministérios (cadastro)" },
  { href: "/dashboard/admin/usuarios", label: "Usuários e acessos" },
];

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string | null }) {
  const isActive =
    href === "/dashboard" || href === "/dashboard/admin"
      ? pathname === href
      : pathname?.startsWith(href);

  return (
    <Link
      href={href}
      className={
        isActive
          ? "block rounded-lg bg-brand-600 px-3 py-2 font-medium text-white shadow-sm"
          : "block rounded-lg px-3 py-2 font-medium text-walnut-200 transition hover:bg-walnut-800 hover:text-white"
      }
    >
      {label}
    </Link>
  );
}

export function DashboardNav({ showAdminLink }: { showAdminLink: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 text-sm">
      {LINKS.map((link) => (
        <NavLink key={link.href} {...link} pathname={pathname} />
      ))}

      {showAdminLink && (
        <>
          <p className="mb-1 mt-5 px-3 text-xs font-semibold uppercase tracking-wide text-walnut-400">
            Administração
          </p>
          {ADMIN_LINKS.map((link) => (
            <NavLink key={link.href} {...link} pathname={pathname} />
          ))}
        </>
      )}
    </nav>
  );
}
