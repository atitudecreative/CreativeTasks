"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/ministries";

export async function createDeliverable(
  ministryId: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sessão expirada. Atualize a página e faça login de novo." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const linkPrincipal = String(formData.get("link_principal") ?? "").trim();
  if (!titulo) return { error: "Dá um título pra entrega." };
  if (!linkPrincipal) return { error: "Precisa de um link (Drive, YouTube, etc.)." };

  const tipoArquivo = String(formData.get("tipo_arquivo") ?? "").trim() || null;
  const versao = String(formData.get("versao") ?? "").trim() || null;
  const campaignId = String(formData.get("campaign_id") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "rascunho");

  // Links complementares: um por linha, campo simples de textarea — bem
  // mais fácil de preencher do que ir adicionando item por item.
  const linksComplementares = String(formData.get("links_complementares") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase.from("deliverables").insert({
    ministry_id: ministryId,
    titulo,
    tipo_arquivo: tipoArquivo,
    versao,
    status,
    campaign_id: campaignId,
    link_principal: linkPrincipal,
    links_complementares: linksComplementares,
    data_entrega: new Date().toISOString().slice(0, 10),
    autor_id: user.id,
  });

  if (error) {
    return { error: "Não consegui salvar a entrega. Confere se você tem permissão pra isso." };
  }

  revalidatePath("/dashboard/entregas");
  if (campaignId) revalidatePath(`/dashboard/campanhas/${campaignId}`);
  return { error: null };
}

// `aprovador` do ministério (ou Comunicação) usa isso — a policy de RLS
// "deliverables: aprovador decide" (migration 0022) é quem garante de
// verdade que só quem pode mexer consegue.
export async function setDeliverableStatus(
  deliverableId: string,
  ministryId: string,
  status: "aprovado" | "rascunho" | "para_aprovacao"
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("deliverables").update({ status }).eq("id", deliverableId);
  revalidatePath("/dashboard/entregas");
}
