import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isComunicacaoGlobal } from "@/lib/data/ministries";
import { getAdminOverview } from "@/lib/data/admin";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !isComunicacaoGlobal(user)) {
    redirect("/dashboard");
  }

  const overview = await getAdminOverview();
  const totalDemandas = overview.reduce((sum, m) => sum + m.demandasAtivas, 0);
  const totalAtrasadas = overview.reduce((sum, m) => sum + m.demandasAtrasadas, 0);
  const totalCampanhasRisco = overview.reduce((sum, m) => sum + m.campanhasEmAtencaoOuCritica, 0);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Painel administrativo</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Visão consolidada de todos os ministérios atendidos pela Comunicação.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Demandas ativas (todos)</p>
          <p className="text-2xl font-semibold text-neutral-900">{totalDemandas}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Demandas atrasadas</p>
          <p className="text-2xl font-semibold text-neutral-900">{totalAtrasadas}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Campanhas em atenção/crítica</p>
          <p className="text-2xl font-semibold text-neutral-900">{totalCampanhasRisco}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Ministério</th>
              <th className="px-4 py-3 font-medium">Demandas ativas</th>
              <th className="px-4 py-3 font-medium">Atrasadas</th>
              <th className="px-4 py-3 font-medium">Campanhas ativas</th>
              <th className="px-4 py-3 font-medium">Em atenção/crítica</th>
            </tr>
          </thead>
          <tbody>
            {overview.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={5}>
                  Nenhum ministério cadastrado ainda.
                </td>
              </tr>
            ) : (
              overview.map((m) => (
                <tr key={m.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-800">{m.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.demandasAtivas}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {m.demandasAtrasadas > 0 ? (
                      <span className="text-red-600">{m.demandasAtrasadas}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{m.campanhasAtivas}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.campanhasEmAtencaoOuCritica}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        Cadastro de ministérios, demandas e campanhas ainda é feito direto no
        Supabase Studio nesta fase (ver README) — telas de edição são um
        próximo passo natural.{" "}
        <Link href="/dashboard/acesso" className="text-brand-600 hover:underline">
          Ver meu acesso
        </Link>
      </p>
    </div>
  );
}
