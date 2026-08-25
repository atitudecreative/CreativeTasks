"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireComunicacao } from "@/lib/data/ministries";

const MAX_CAPA_SIZE = 4 * 1024 * 1024; // 4MB

function revalidateCampaignPaths(id?: string) {
  revalidatePath("/dashboard/admin/campanhas-pendentes");
  if (id) revalidatePath(`/dashboard/admin/campanhas-pendentes/${id}`);
  revalidatePath("/dashboard/campanhas");
  if (id) revalidatePath(`/dashboard/campanhas/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
}

function parseMoney(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
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

  revalidateCampaignPaths(id);
}

// Substitui a lista de ministérios liberados manualmente pra uma
// campanha (migration 0026) — soma-se à visibilidade automática por
// demanda vinculada, nunca substitui ela. Vem da tela de edição como
// um form com vários checkboxes "ministryId" marcados.
export async function setCampaignMinistryVisibility(formData: FormData) {
  await requireComunicacao();

  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return;

  const ministryIds = formData.getAll("ministryId").map(String).filter(Boolean);

  const supabase = await createClient();
  await supabase.from("campaign_ministries").delete().eq("campaign_id", campaignId);
  if (ministryIds.length > 0) {
    await supabase
      .from("campaign_ministries")
      .insert(ministryIds.map((ministryId) => ({ campaign_id: campaignId, ministry_id: ministryId })));
  }

  revalidateCampaignPaths(campaignId);
}

// Edição completa da campanha/evento — só existe aqui (admin, Comunicação).
// A aba pública "Campanhas e eventos" (/dashboard/campanhas) é só leitura:
// dashboard do evento + demandas relacionadas, sem controles de edição.
export async function updateCampaignDetails(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "campanha");
  const fase = String(formData.get("fase") ?? "");
  const saude = String(formData.get("saude") ?? "");
  const objetivoEstrategico = String(formData.get("objetivo_estrategico") ?? "").trim() || null;
  const escopoMacro = String(formData.get("escopo_macro") ?? "").trim() || null;
  const dataInicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const dataTermino = String(formData.get("data_termino") ?? "").trim() || null;
  const dataEvento = String(formData.get("data_evento") ?? "").trim() || null;
  const orcamentoPlanejado = parseMoney(formData.get("orcamento_planejado"));
  const orcamentoAprovado = parseMoney(formData.get("orcamento_aprovado"));
  const investimentoRealizado = parseMoney(formData.get("investimento_realizado"));
  const resultadosObservacoes = String(formData.get("resultados_observacoes") ?? "").trim() || null;

  if (!id || !nome) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({
      nome,
      tipo,
      fase,
      saude,
      objetivo_estrategico: objetivoEstrategico,
      escopo_macro: escopoMacro,
      data_inicio: dataInicio,
      data_termino: dataTermino,
      data_evento: dataEvento,
      orcamento_planejado: orcamentoPlanejado,
      orcamento_aprovado: orcamentoAprovado,
      investimento_realizado: investimentoRealizado,
      resultados_observacoes: resultadosObservacoes,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateCampaignPaths(id);
  return { error: null };
}

// Sobe a arte de capa da campanha (banner exibido no dashboard público do
// evento). Mesmo bucket "branding" e mesmas policies das capas de
// ministério — escrita restrita à Comunicação.
export async function uploadCampaignCapa(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const campaignId = String(formData.get("campaignId") ?? "");
  const file = formData.get("capa");

  if (!campaignId) {
    return { error: "Campanha inválida." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione uma imagem." };
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { error: "Formato não aceito — use PNG, JPG ou WEBP." };
  }
  if (file.size > MAX_CAPA_SIZE) {
    return { error: "Arquivo muito grande — o limite é 4MB." };
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const admin = createAdminClient();
  const path = `campanhas/${campaignId}/capa-${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("branding")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicUrlData } = admin.storage.from("branding").getPublicUrl(path);

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("campaigns")
    .update({ capa_url: publicUrlData.publicUrl })
    .eq("id", campaignId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateCampaignPaths(campaignId);
  return { error: null };
}

export async function removeCampaignCapa(formData: FormData) {
  await requireComunicacao();

  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return;

  const supabase = await createClient();
  await supabase.from("campaigns").update({ capa_url: null }).eq("id", campaignId);

  revalidateCampaignPaths(campaignId);
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

// ---------------------------------------------------------------
// Meta Ads (migration 0025) — o sync (scripts/sync-meta-ads.mjs) casa
// campanha do Meta com campanha do portal por nome; quando não bate,
// fica na fila "sem vínculo" aqui embaixo pra Comunicação resolver à
// mão. `matched_manualmente = true` marca a decisão como definitiva —
// o próximo sync NUNCA sobrescreve um vínculo (ou uma decisão de "sem
// vínculo mesmo") feito manualmente.
// ---------------------------------------------------------------

export async function linkMetaCampaign(formData: FormData) {
  await requireComunicacao();

  const metaAdCampaignId = String(formData.get("metaAdCampaignId") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "") || null;
  if (!metaAdCampaignId) return;

  const supabase = await createClient();
  await supabase
    .from("meta_ad_campaigns")
    .update({ campaign_id: campaignId, matched_manualmente: true })
    .eq("id", metaAdCampaignId);

  revalidateCampaignPaths(campaignId ?? undefined);
}

export async function unlinkMetaCampaign(formData: FormData) {
  await requireComunicacao();

  const metaAdCampaignId = String(formData.get("metaAdCampaignId") ?? "");
  const previousCampaignId = String(formData.get("previousCampaignId") ?? "") || undefined;
  if (!metaAdCampaignId) return;

  const supabase = await createClient();
  // Fica marcada como revisada (matched_manualmente = true) mesmo sem
  // campanha nenhuma — assim não volta a aparecer na fila "sem vínculo"
  // depois de decidido que essa campanha do Meta não corresponde a
  // nada no portal.
  await supabase
    .from("meta_ad_campaigns")
    .update({ campaign_id: null, matched_manualmente: true })
    .eq("id", metaAdCampaignId);

  revalidateCampaignPaths(previousCampaignId);
}
