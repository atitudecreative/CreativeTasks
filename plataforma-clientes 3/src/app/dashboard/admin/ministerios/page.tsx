import { notFound } from "next/navigation";
import Link from "next/link";
import { requireComunicacao, getMinistryById } from "@/lib/data/ministries";
import { createClient } from "@/lib/supabase/server";
import { EditMinistryForm } from "../EditMinistryForm";
import { DeleteMinistryButton } from "../DeleteMinistryButton";

export default async function EditMinistryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireComunicacao();
  const { id } = await params;
  const ministry = await getMinistryById(id);
  if (!ministry) notFound();

  const supabase = await createClient();
  const [{ count: memberCount }, { count: demandCount }] = await Promise.all([
    supabase.from("ministry_members").select("*", { count: "exact", head: true }).eq("ministry_id", id),
    supabase.from("demands").select("*", { count: "exact", head: true }).eq("ministry_id", id),
  ]);

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/admin/ministerios" className="mb-3 inline-block text-xs text-neutral-500 hover:underline">
        ← Voltar pra Ministérios
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Editar ministério</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {memberCount ?? 0} usuário(s) vinculado(s) · {demandCount ?? 0} demanda(s)
      </p>

      <div className="mb-6">
        <EditMinistryForm ministry={ministry} />
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5">
        <p className="mb-1 text-sm font-medium text-rose-700">Zona de risco</p>
        <p className="mb-3 text-xs text-rose-600">
          Excluir apaga esse ministério e tudo que está vinculado a ele (usuários, demandas,
          campanhas, entregas e fonte de dados do Asana). Não tem como desfazer.
        </p>
        <DeleteMinistryButton
          id={ministry.id}
          name={ministry.name}
          memberCount={memberCount ?? 0}
          demandCount={demandCount ?? 0}
          variant="full"
        />
      </div>
    </div>
  );
}
