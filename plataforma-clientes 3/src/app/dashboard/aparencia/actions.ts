"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidHex } from "@/lib/theme";

// Salva a cor PESSOAL do usuário logado (colunas brand_color/walnut_color
// em profiles). A policy "profiles: usuário edita o próprio perfil" já
// permite essa escrita pra qualquer usuário autenticado editando o
// próprio id — não precisa de service role nem de checar papel_global.
export async function updateMyTheme(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada — faça login de novo." };
  }

  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const walnutColor = String(formData.get("walnutColor") ?? "").trim();

  if (!isValidHex(brandColor) || !isValidHex(walnutColor)) {
    return { error: "Cor inválida — use o seletor ou um código hex tipo #f3701c." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ brand_color: brandColor, walnut_color: walnutColor })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  // "layout" revalida o site inteiro pra essa sessão — a cor é lida uma
  // vez no layout raiz e injetada como CSS, não recalculada por página.
  revalidatePath("/", "layout");
  return { error: null };
}

// Remove a customização pessoal (volta a usar a cor padrão do site).
export async function resetMyTheme() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("profiles")
    .update({ brand_color: null, walnut_color: null })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}
