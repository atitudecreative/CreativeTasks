"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Avatar, Badge, Button, EmptyState, Icon, SearchInput, Select,
  Table, TBody, TD, TH, THead, TR, TableScroll, TableEmpty,
} from "@/components/ui";
import { CATEGORIA_LABEL, MINISTRY_STATUS_TONE, MINISTRY_STATUS_LABEL } from "@/lib/ministryOptions";
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

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* Tabela de cadastro. Além do visual: colunas secundárias (sigla,
   categoria) somem em telas estreitas em vez de espremer as principais, e
   a ação de excluir sai do meio da linha — fica num menu no fim, que é
   onde uma ação destrutiva não é clicada por acidente. */
export function MinistriesTable({ ministries }: { ministries: MinistryRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return ministries.filter((m) => {
      const matchesSearch = !term || normalize(m.name).includes(term) || normalize(m.sigla ?? "").includes(term);
      return matchesSearch && (!statusFilter || m.status === statusFilter);
    });
  }, [ministries, search, statusFilter]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por nome ou sigla..."
          aria-label="Buscar ministério"
          className="w-full sm:w-72"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por status"
          className="w-auto"
        >
          <option value="">Todos os status</option>
          {Object.entries(MINISTRY_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-caption tabular-nums text-ink-3">
          {filtered.length} de {ministries.length}
        </span>
      </div>

      {ministries.length === 0 ? (
        <EmptyState
          icon={<Icon.Building className="h-5 w-5" />}
          title="Nenhum ministério cadastrado"
          description="Cadastre o primeiro ministério para começar a organizar a carteira."
        />
      ) : (
        <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-xs">
          <TableScroll>
            <Table>
              <THead>
                <TR>
                  <TH>Ministério</TH>
                  <TH className="hidden md:table-cell">Categoria</TH>
                  <TH>Status</TH>
                  <TH numeric className="hidden sm:table-cell">Usuários</TH>
                  <TH numeric className="hidden sm:table-cell">Demandas</TH>
                  <TH className="w-0" />
                </TR>
              </THead>
              <TBody>
                {filtered.length === 0 ? (
                  <TableEmpty colSpan={6}>Nenhum ministério encontrado para essa busca.</TableEmpty>
                ) : (
                  filtered.map((m) => (
                    <TR key={m.id} interactive>
                      <TD strong>
                        <Link
                          href={`/dashboard/admin/ministerios/${m.id}`}
                          className="flex items-center gap-2.5 transition-colors hover:text-brand-600"
                        >
                          <Avatar name={m.name} size="xs" />
                          <span className="min-w-0">
                            <span className="block truncate">{m.name}</span>
                            {m.sigla && <span className="block font-mono text-[0.625rem] uppercase text-ink-3">{m.sigla}</span>}
                          </span>
                        </Link>
                      </TD>
                      <TD className="hidden md:table-cell">{CATEGORIA_LABEL[m.categoria] ?? m.categoria}</TD>
                      <TD>
                        <Badge tone={MINISTRY_STATUS_TONE[m.status] ?? "neutral"} size="sm" dot>
                          {MINISTRY_STATUS_LABEL[m.status] ?? m.status}
                        </Badge>
                      </TD>
                      <TD numeric className="hidden sm:table-cell">
                        {m.memberCount}
                      </TD>
                      <TD numeric className="hidden sm:table-cell">
                        {m.demandCount}
                      </TD>
                      <TD className="w-0 whitespace-nowrap">
                        <span className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/admin/ministerios/${m.id}`}>
                            <Button variant="ghost" size="sm" iconLeft={<Icon.Edit className="h-3.5 w-3.5" />}>
                              <span className="hidden lg:inline">Editar</span>
                            </Button>
                          </Link>
                          <DeleteMinistryButton
                            id={m.id}
                            name={m.name}
                            memberCount={m.memberCount}
                            demandCount={m.demandCount}
                          />
                        </span>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </TableScroll>
        </div>
      )}
    </div>
  );
}
