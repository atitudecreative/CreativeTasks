"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireComunicacao } from "@/lib/data/ministries";

export async function publishCampaign(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "campanha");

  if (!id || !nome) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("campaigns")
    .update({ nome, tipo, publicada: true })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/campanhas-pendentes");
  revalidatePath("/dashboard/campanhas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function dismissCampaign(formData: FormData) {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // "Ignorar" apaga a campanha pendente — as demandas ficam sem campanha
  // vinculada (a coluna campaign_id delas volta pra null automaticamente).
  await supabase.from("campaigns").delete().eq("id", id).eq("publicada", false);

  revalidatePath("/dashboard/admin/campanhas-pendentes");
}
