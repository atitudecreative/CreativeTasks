"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireComunicacao } from "@/lib/data/ministries";
import { isValidHex, DEFAULT_BRAND_COLOR, DEFAULT_WALNUT_COLOR } from "@/lib/theme";

export async function updateSiteTheme(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const walnutColor = String(formData.get("walnutColor") ?? "").trim();

  if (!isValidHex(brandColor) || !isValidHex(walnutColor)) {
    return { error: "Cor inválida — use o seletor ou um código hex tipo #f3701c." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_theme")
    .update({ brand_color: brandColor, walnut_color: walnutColor, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) {
    return { error: error.message };
  }

  // "layout" revalida tudo que passa pelo layout raiz (ou seja, o site
  // inteiro) — precisa disso porque a cor é lida uma vez no layout e
  // injetada como CSS, não recalculada por página.
  revalidatePath("/", "layout");
  return { error: null };
}

export async function resetSiteTheme() {
  await requireComunicacao();

  const supabase = await createClient();
  await supabase
    .from("site_theme")
    .update({ brand_color: DEFAULT_BRAND_COLOR, walnut_color: DEFAULT_WALNUT_COLOR, updated_at: new Date().toISOString() })
    .eq("id", true);

  revalidatePath("/", "layout");
}
