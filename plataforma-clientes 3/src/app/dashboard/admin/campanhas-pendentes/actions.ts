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

// ---------------------------------------------------------------
// Pastas de campanha (migration 0012, globais desde a 0018) — agrupam
// campanhas relacionadas, ex: pasta "Festa da Roça" com uma campanha
// por edição/ano. Não pertencem mais a um ministério específico.
// ---------------------------------------------------------------

export async function createCampaignFolder(formData: FormData) {
  await requireComunicacao();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const supabase = await createClient();
  const { data: siblings } = await supabase
    .from("campaign_folders")
    .select("posicao")
    .order("posicao", { ascending: false })
    .limit(1);
  const posicao = (siblings?.[0]?.posicao ?? -1) + 1;

  await supabase.from("campaign_folders").insert({ nome, posicao });

  revalidateCampaignPaths();
}

export async function renameCampaignFolder(formData: FormData) {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) return;

  const supabase = await createClient();
  await supabase.from("campaign_folders").update({ nome }).eq("id", id);

  revalidateCampaignPaths();
}

export async function deleteCampaignFolder(formData: FormData) {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // As campanhas dentro da pasta ficam "sem pasta" (on delete set null) —
  // não são apagadas.
  await supabase.from("campaign_folders").delete().eq("id", id);

  revalidateCampaignPaths();
}

// Move uma campanha pra dentro de uma pasta (ou de volta pra "sem pasta",
// quando folderId vem vazio), sempre entrando no fim da lista de destino.
// A posição é calculada dentro da pasta (ou de "sem pasta") inteira, sem
// mais separar por ministério — pastas são globais desde a migration 0018.
export async function moveCampaignToFolder(formData: FormData) {
  await requireComunicacao();

  const campaignId = String(formData.get("campaignId") ?? "");
  const folderId = String(formData.get("folderId") ?? "") || null;
  if (!campaignId) return;

  const supabase = await createClient();

  let query = supabase.from("campaigns").select("posicao");
  query = folderId ? query.eq("folder_id", folderId) : query.is("folder_id", null);
  const { data: siblings } = await query.order("posicao", { ascending: false }).limit(1);
  const posicao = (siblings?.[0]?.posicao ?? -1) + 1;

  await supabase.from("campaigns").update({ folder_id: folderId, posicao }).eq("id", campaignId);

  revalidateCampaignPaths();
}

// Troca a posição de exibição entre duas campanhas (usado pelos botões
// "mover pra cima/baixo" — o cliente já sabe quem é o vizinho na lista
// ordenada que está exibindo, então só manda os dois ids pra trocar).
export async function swapCampaignPositions(formData: FormData) {
  await requireComunicacao();

  const idA = String(formData.get("idA") ?? "");
  const idB = String(formData.get("idB") ?? "");
  if (!idA || !idB) return;

  const supabase = await createClient();
  const { data: rows } = await supabase.from("campaigns").select("id, posicao").in("id", [idA, idB]);
  if (!rows || rows.length !== 2) return;

  const [a, b] = rows;
  await Promise.all([
    supabase.from("campaigns").update({ posicao: b.posicao }).eq("id", a.id),
    supabase.from("campaigns").update({ posicao: a.posicao }).eq("id", b.id),
  ]);

  revalidateCampaignPaths();
}
