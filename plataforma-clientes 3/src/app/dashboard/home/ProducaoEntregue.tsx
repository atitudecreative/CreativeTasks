import Link from "next/link";
import type { FatiaProducao } from "@/lib/home";

/* =========================================================================
   PRODUÇÃO ENTREGUE NO PERÍODO
   -------------------------------------------------------------------------
   O outro lado do resultado: o que a Comunicação produziu. Barras de uma
   cor só, porque aqui a pergunta é "quanto de cada", não "quem é quem" —
   cor por tipo transformaria dois gráficos simples num arco-íris.
   ========================================================================= */

function rotulo(chave: string) {
  if (chave === "sem-tipo") return "Sem tipo informado";
  return chave.charAt(0).toUpperCase() + chave.slice(1);
}

function Lista({ titulo, total, itens, href, unidade }: {
  titulo: string;
  total: number;
  itens: FatiaProducao[];
  href: string;
  unidade: [string, string];
}) {
  const max = Math.max(...itens.map((i) => i.total), 0);
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="font-mono text-label uppercase text-ink-3">{titulo}</p>
        <Link href={href} className="inline-flex min-h-6 items-center text-caption text-brand-600 underline-offset-4 hover:underline">
          {total} {total === 1 ? unidade[0] : unidade[1]}
        </Link>
      </div>
      {itens.length === 0 ? (
        <p className="text-caption text-ink-3">Nada registrado neste período.</p>
      ) : (
        <ul className="space-y-2.5">
          {itens.slice(0, 6).map((i) => (
            <li key={i.chave} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
              <span className="truncate text-caption text-ink-2" title={rotulo(i.chave)}>
                {rotulo(i.chave)}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-neutral-soft">
                <span
                  className="block h-full origin-left rounded-full bg-brand-600 animate-bar-grow"
                  style={{ width: `${max > 0 ? Math.max(3, (i.total / max) * 100) : 0}%` }}
                />
              </span>
              <span className="text-right text-caption font-medium tabular-nums text-ink">{i.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProducaoEntregue({
  demandas,
  arquivos,
}: {
  demandas: { total: number; porTipo: FatiaProducao[] };
  arquivos: { total: number; porTipo: FatiaProducao[] };
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
      <Lista
        titulo="Demandas concluídas"
        total={demandas.total}
        itens={demandas.porTipo}
        href="/dashboard/demandas"
        unidade={["demanda", "demandas"]}
      />
      <Lista
        titulo="Arquivos entregues"
        total={arquivos.total}
        itens={arquivos.porTipo}
        href="/dashboard/entregas"
        unidade={["arquivo", "arquivos"]}
      />
    </div>
  );
}
