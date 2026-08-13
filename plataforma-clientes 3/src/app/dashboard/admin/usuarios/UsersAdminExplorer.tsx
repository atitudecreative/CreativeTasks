"use client";

import { useMemo, useState } from "react";
import { UserRow, type UserRowData } from "./UserRow";

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function Section({
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
    <div className="mb-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-neutral-800">{title}</span>
        <span className="flex items-center gap-2 text-xs text-neutral-400">
          {count} usuário{count === 1 ? "" : "s"}
          <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>
        </span>
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
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou ministério..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <span className="text-xs text-neutral-400">
          {filtered.length} de {users.length}
        </span>
      </div>

      {admins.length > 0 && (
        <Section title="Administradores e equipe de Comunicação" count={admins.length} defaultOpen>
          {admins.map((u) => (
            <UserRow key={u.id} user={u} currentUserId={currentUserId} allMinistries={ministries} />
          ))}
        </Section>
      )}

      {ministries.map((m) => {
        const members = byMinistry.get(m.id) ?? [];
        if (hasActiveFilter && members.length === 0) return null;

        return (
          <Section key={m.id} title={m.name} count={members.length} defaultOpen={hasActiveFilter}>
            {members.length === 0 ? (
              <p className="px-4 py-3 text-xs text-neutral-400">Nenhum usuário vinculado ainda.</p>
            ) : (
              members.map((u) => (
                <UserRow key={u.id} user={u} currentUserId={currentUserId} allMinistries={ministries} />
              ))
            )}
          </Section>
        );
      })}

      {semAcesso.length > 0 && (
        <Section title="Sem acesso" count={semAcesso.length} defaultOpen={hasActiveFilter}>
          {semAcesso.map((u) => (
            <UserRow key={u.id} user={u} currentUserId={currentUserId} allMinistries={ministries} />
          ))}
        </Section>
      )}

      {filtered.length === 0 && (
        <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400">
          Nenhum usuário encontrado para essa busca.
        </p>
      )}
    </div>
  );
}
