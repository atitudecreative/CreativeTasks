import { requireComunicacao } from "@/lib/data/ministries";
import { getAllMinistries } from "@/lib/data/ministries";
import { CreateMinistryForm } from "./CreateMinistryForm";

const CATEGORIA_LABEL: Record<string, string> = {
  ministerio: "Ministério",
  rede: "Rede",
  programa: "Programa",
  area_institucional: "Área institucional",
  evento_recorrente: "Evento recorrente",
};

export default async function AdminMinisteriosPage() {
  await requireComunicacao();
  const ministries = await getAllMinistries();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Ministérios</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Cadastro dos ministérios, redes e áreas atendidas pela Comunicação.
      </p>

      <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Sigla</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ministries.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={4}>
                  Nenhum ministério cadastrado ainda — crie o primeiro abaixo.
                </td>
              </tr>
            ) : (
              ministries.map((m) => (
                <tr key={m.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-800">{m.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.sigla ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {CATEGORIA_LABEL[m.categoria] ?? m.categoria}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">{m.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateMinistryForm />
    </div>
  );
}
