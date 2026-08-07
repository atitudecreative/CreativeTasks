"use server";

import { revalidatePath } from "next/cache";
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
