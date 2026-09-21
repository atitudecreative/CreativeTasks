"use client";

import { useMemo, useState } from "react";
import { Badge, EmptyState, Icon, SearchInput } from "@/components/ui";
import { UserRow, type UserRowData } from "./UserRow";

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/* Grupo colapsável por ministério. O chevron era um caractere "›"
   rotacionado; virou ícone do sistema, e o botão ganhou aria-expanded. */
function Group({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-2.5 overflow-hidden rounded-panel border border-line bg-surface shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-120 hover:bg-surface-sunken ${
          open ? "border-b border-line" : ""
        }`}
      >
        <Icon.ChevronRight
          className={`h-4 w-4 shrink-0 text-ink-3 transition-transform duration-180 ease-snap ${open ? "rotate-90" : ""}`}
        />
        <span className="min-w-0 flex-1 truncate text-h4 text-ink">{title}</span>
        <Badge tone="neutral" size="sm">
          {count}
        </Badge>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export function UsersAdminExplorer({
  users,
  ministries,
  currentUserId,
}: {
  users: UserRowData[];
  ministries: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return users;
    return users.filter(
      (u) =>
        normalize(u.email).includes(term) ||
        normalize(u.fullName ?? "").includes(term) ||
        u.memberships.some((m) => normalize(m.ministryName).includes(term))
    );
  }, [users, search]);

  const hasActiveFilter = search.trim().length > 0;

  const admins = filtered.filter((u) => u.papelGlobal !== "nenhum");
  const semAcesso = filtered.filter((u) => u.papelGlobal === "nenhum" && u.memberships.length === 0);

  const byMinistry = useMemo(() => {
    const map = new Map<string, UserRowData[]>();
    for (const m of ministries) map.set(m.id, []);
    for (const u of filtered) {
      for (const mem of u.memberships) {
        if (!map.has(mem.ministryId)) map.set(mem.ministryId, []);
        map.get(mem.ministryId)!.push(u);
      }
    }
    return map;
  }, [filtered, ministries]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por nome, e-mail ou ministério..."
          aria-label="Buscar usuário"
          className="w-full sm:max-w-sm"
        />
        <span className="text-caption tabular-nums text-ink-3">
          {filtered.length} de {users.length}
        </span>
      </div>

      {admins.length > 0 && (
        <Group title="Administradores e equipe de Comunicação" count={admins.length} defaultOpen>
          {admins.map((u) => (
            <UserRow key={u.id} user={u} currentUserId={currentUserId} allMinistries={ministries} />
          ))}
        </Group>
      )}

      {ministries.map((m) => {
        const members = byMinistry.get(m.id) ?? [];
        if (hasActiveFilter && members.length === 0) return null;

        return (
          <Group key={m.id} title={m.name} count={members.length} defaultOpen={hasActiveFilter}>
            {members.length === 0 ? (
              <p className="px-4 py-3 text-xs text-ink-3">Nenhum usuário vinculado ainda.</p>
            ) : (
              members.map((u) => (
                <UserRow key={u.id} user={u} currentUserId={currentUserId} allMinistries={ministries} />
              ))
            )}
          </Group>
        );
      })}

      {semAcesso.length > 0 && (
        <Group title="Sem acesso" count={semAcesso.length} defaultOpen={hasActiveFilter}>
          {semAcesso.map((u) => (
            <UserRow key={u.id} user={u} currentUserId={currentUserId} allMinistries={ministries} />
          ))}
        </Group>
      )}

      {filtered.length === 0 && (
        <EmptyState
          icon={<Icon.Users className="h-5 w-5" />}
          title="Nenhum usuário encontrado"
          description="Tente buscar por outro nome, e-mail ou ministério."
        />
      )}
    </div>
  );
}
