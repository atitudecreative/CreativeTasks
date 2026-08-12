"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireComunicacao } from "@/lib/data/ministries";

function revalidateCampaignPaths() {
  revalidatePath("/dashboard/admin/campanhas-pendentes");
  revalidatePath("/dashboard/campanhas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
}

// Liga/desliga a visibilidade da campanha pro ministério — um toggle só,
// em vez de duas telas separadas de "publicar" e "ocultar".
export async function setCampaignVisibility(formData: FormData) {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  const publicada = formData.get("publicada") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("campaigns").update({ publicada }).eq("id", id);

  revalidateCampaignPaths();
}

export async function updateCampaignMeta(
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
  const { error } = await supabase.from("campaigns").update({ nome, tipo }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateCampaignPaths();
  return { error: null };
}

export async function deleteCampaign(formData: FormData) {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // Apaga a campanha de vez, esteja ativa ou oculta — o vínculo em
  // demand_campaigns some junto (cascade). As demandas continuam existindo,
  // só ficam sem essa campanha.
  await supabase.from("campaigns").delete().eq("id", id);

  revalidateCampaignPaths();
}
