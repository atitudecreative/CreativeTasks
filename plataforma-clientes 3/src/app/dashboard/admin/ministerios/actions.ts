"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireComunicacao } from "@/lib/data/ministries";
import { isValidHex } from "@/lib/theme";

const MAX_CAPA_SIZE = 4 * 1024 * 1024; // 4MB — foto de fundo pode ser um pouco maior que um PNG de logo

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

// Sobe a imagem de capa desse ministério (fundo do menu lateral quando
// ele é o ativo). Só a Comunicação faz isso — troca a "cara" de um
// ministério pra todo mundo vinculado a ele.
export async function uploadMinistryCapa(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const ministryId = String(formData.get("ministryId") ?? "");
  const file = formData.get("capa");

  if (!ministryId) {
    return { error: "Ministério inválido." };
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
  const path = `ministerios/${ministryId}/capa-${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("branding")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicUrlData } = admin.storage.from("branding").getPublicUrl(path);

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("ministries")
    .update({ capa_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", ministryId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/dashboard/admin/ministerios/${ministryId}`);
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

export async function removeMinistryCapa(formData: FormData) {
  await requireComunicacao();

  const ministryId = String(formData.get("ministryId") ?? "");
  if (!ministryId) return;

  const supabase = await createClient();
  await supabase
    .from("ministries")
    .update({ capa_url: null, updated_at: new Date().toISOString() })
    .eq("id", ministryId);

  revalidatePath(`/dashboard/admin/ministerios/${ministryId}`);
  revalidatePath("/dashboard", "layout");
}

// Cor principal/secundária desse ministério (migration 0024) — substitui
// a antiga preferência pessoal por usuário. Só a Comunicação define,
// aqui na edição do ministério; vale pra todo mundo que tiver esse
// ministério como ativo na sessão.
export async function updateMinistryTheme(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const ministryId = String(formData.get("ministryId") ?? "");
  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const walnutColor = String(formData.get("walnutColor") ?? "").trim();

  if (!ministryId) {
    return { error: "Ministério inválido." };
  }
  if (!isValidHex(brandColor) || !isValidHex(walnutColor)) {
    return { error: "Cor inválida — use o seletor ou um código hex tipo #f3701c." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ministries")
    .update({ brand_color: brandColor, walnut_color: walnutColor, updated_at: new Date().toISOString() })
    .eq("id", ministryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/admin/ministerios/${ministryId}`);
  // "layout" revalida o site inteiro — a cor é lida uma vez no layout
  // raiz e injetada como CSS, não recalculada por página.
  revalidatePath("/", "layout");
  return { error: null };
}

// Remove a cor própria do ministério (volta a usar a cor padrão do site).
export async function resetMinistryTheme(formData: FormData) {
  await requireComunicacao();

  const ministryId = String(formData.get("ministryId") ?? "");
  if (!ministryId) return;

  const supabase = await createClient();
  await supabase
    .from("ministries")
    .update({ brand_color: null, walnut_color: null, updated_at: new Date().toISOString() })
    .eq("id", ministryId);

  revalidatePath(`/dashboard/admin/ministerios/${ministryId}`);
  revalidatePath("/", "layout");
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
