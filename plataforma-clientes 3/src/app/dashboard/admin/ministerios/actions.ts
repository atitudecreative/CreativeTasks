"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireComunicacao } from "@/lib/data/ministries";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createMinistry(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const name = String(formData.get("name") ?? "").trim();
  const sigla = String(formData.get("sigla") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "ministerio");
  const pastorResponsavel = String(formData.get("pastorResponsavel") ?? "").trim() || null;
  const pontoFocalMinisterio = String(formData.get("pontoFocalMinisterio") ?? "").trim() || null;
  const pontoFocalComunicacao = String(formData.get("pontoFocalComunicacao") ?? "").trim() || null;

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = await createClient();

  let slug = slugify(name);
  if (!slug) slug = `ministerio-${Date.now()}`;

  const { error } = await supabase.from("ministries").insert({
    name,
    slug,
    sigla,
    categoria,
    pastor_responsavel: pastorResponsavel,
    ponto_focal_ministerio: pontoFocalMinisterio,
    ponto_focal_comunicacao: pontoFocalComunicacao,
  });

  if (error) {
    // slug único pode colidir se já existir um ministério com nome parecido
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/ministerios");
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function updateMinistry(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sigla = String(formData.get("sigla") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "ministerio");
  const status = String(formData.get("status") ?? "ativo");
  const description = String(formData.get("description") ?? "").trim() || null;
  const pastorResponsavel = String(formData.get("pastorResponsavel") ?? "").trim() || null;
  const pontoFocalMinisterio = String(formData.get("pontoFocalMinisterio") ?? "").trim() || null;
  const pontoFocalComunicacao = String(formData.get("pontoFocalComunicacao") ?? "").trim() || null;
  const centroCusto = String(formData.get("centroCusto") ?? "").trim() || null;

  if (!id || !name) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("ministries")
    .update({
      name,
      sigla,
      categoria,
      status,
      description,
      pastor_responsavel: pastorResponsavel,
      ponto_focal_ministerio: pontoFocalMinisterio,
      ponto_focal_comunicacao: pontoFocalComunicacao,
      centro_custo: centroCusto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/ministerios");
  revalidatePath(`/dashboard/admin/ministerios/${id}`);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteMinistry(formData: FormData) {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // Cascade (migrations 0001/0004) apaga junto: vínculos de membro, fontes
  // de dados do Asana, métricas, campanhas, demandas e entregas desse
  // ministério. A confirmação na UI já avisa isso antes de chegar aqui.
  await supabase.from("ministries").delete().eq("id", id);

  revalidatePath("/dashboard/admin/ministerios");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  redirect("/dashboard/admin/ministerios");
}
