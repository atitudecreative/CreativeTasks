"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIA_LABEL, MINISTRY_STATUS_COLOR, MINISTRY_STATUS_LABEL } from "@/lib/ministryOptions";
import { DeleteMinistryButton } from "./DeleteMinistryButton";

export type MinistryRow = {
  id: string;
  name: string;
  slug: string;
  sigla: string | null;
  categoria: string;
  status: string;
  memberCount: number;
  demandCount: number;
};

export function MinistriesTable({ ministries }: { ministries: MinistryRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ministries.filter((m) => {
      const matchesSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        (m.sigla ?? "").toLowerCase().includes(term);
      const matchesStatus = !statusFilter || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ministries, search, statusFilter]);

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou sigla..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(MINISTRY_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-400">
          {filtered.length} de {ministries.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Sigla</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Usuários</th>
              <th className="px-4 py-3 font-medium">Demandas</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={7}>
                  {ministries.length === 0
                    ? "Nenhum ministério cadastrado ainda — crie o primeiro abaixo."
                    : "Nenhum ministério encontrado para essa busca."}
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-800">
                    <Link href={`/dashboard/admin/ministerios/${m.id}`} className="hover:underline">
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{m.sigla ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {CATEGORIA_LABEL[m.categoria] ?? m.categoria}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        MINISTRY_STATUS_COLOR[m.status] ?? "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {MINISTRY_STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{m.memberCount}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.demandCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/admin/ministerios/${m.id}`}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        Editar
                      </Link>
                      <DeleteMinistryButton
                        id={m.id}
                        name={m.name}
                        memberCount={m.memberCount}
                        demandCount={m.demandCount}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
