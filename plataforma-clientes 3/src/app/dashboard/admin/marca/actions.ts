"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireComunicacao } from "@/lib/data/ministries";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB — mais que suficiente pra um PNG de logo

export async function uploadSiteLogo(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo PNG." };
  }
  if (file.type !== "image/png") {
    return { error: "Só aceita arquivos PNG." };
  }
  if (file.size > MAX_LOGO_SIZE) {
    return { error: "Arquivo muito grande — o limite é 2MB." };
  }

  // Service role: o bucket "branding" já tem policy de escrita pra
  // Comunicação (migration 0016), mas usar a admin client aqui evita
  // qualquer problema de sessão/token no upload do arquivo.
  const admin = createAdminClient();
  const path = `logo-${Date.now()}.png`;

  const { error: uploadError } = await admin.storage
    .from("branding")
    .upload(path, file, { contentType: "image/png", upsert: false });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicUrlData } = admin.storage.from("branding").getPublicUrl(path);

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("site_theme")
    .update({ logo_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (updateError) {
    return { error: updateError.message };
  }

  // "layout" revalida o site inteiro — a logo é lida no layout do
  // dashboard e na tela de login, não recalculada por página.
  revalidatePath("/", "layout");
  return { error: null };
}

export async function resetSiteLogo() {
  await requireComunicacao();

  const supabase = await createClient();
  await supabase
    .from("site_theme")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", true);

  revalidatePath("/", "layout");
}
