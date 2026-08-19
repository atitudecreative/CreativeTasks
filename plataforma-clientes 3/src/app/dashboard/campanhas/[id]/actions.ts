"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireComunicacao } from "@/lib/data/ministries";

const MAX_CAPA_SIZE = 4 * 1024 * 1024; // 4MB

function revalidateCampaignPaths(id: string) {
  revalidatePath(`/dashboard/campanhas/${id}`);
  revalidatePath("/dashboard/campanhas");
  revalidatePath("/dashboard/admin/campanhas-pendentes");
  revalidatePath("/dashboard");
}

function parseMoney(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

// Edita as informações da campanha direto na tela de detalhe (em vez de só
// pela lista administrativa em /dashboard/admin/campanhas-pendentes, que
// só tinha nome/tipo). Continua restrito à Comunicação — campanha é uma
// tag global, compartilhada entre ministérios.
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

// Sobe a arte de capa da campanha (banner no topo da tela de detalhe).
// Mesmo bucket "branding" e mesmas policies das capas de ministério.
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
