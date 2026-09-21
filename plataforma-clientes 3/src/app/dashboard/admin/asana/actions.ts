"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireComunicacao } from "@/lib/data/ministries";
import { STATUS_LABEL } from "@/lib/demandOptions";

/* Ações do de-para de status. Toda uma passa por requireComunicacao()
   antes de tocar no banco — a policy de RLS da migration 0031 já exige
   Comunicação, mas checar aqui também evita gravar e só então descobrir
   que não podia. */

const STATUS_VALIDOS = new Set(Object.keys(STATUS_LABEL));

type Resultado = { error: string | null };

/**
 * Define o status de uma coluna de quadro.
 *
 * `ministryId` vazio grava a regra GLOBAL (vale pra todo quadro com uma
 * coluna de mesmo nome); preenchido grava a exceção daquele ministério,
 * que vence a global.
 */
export async function salvarRegraStatus(formData: FormData): Promise<Resultado> {
  await requireComunicacao();

  const secaoNormalizada = String(formData.get("secaoNormalizada") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const escopo = String(formData.get("escopo") ?? "global");
  const ministryId = String(formData.get("ministryId") ?? "").trim();

  if (!secaoNormalizada) return { error: "Coluna não identificada." };

  const supabase = await createClient();

  // Status vazio = "voltar ao padrão": remove a regra em vez de gravar
  // um valor inventado.
  if (!status) {
    const query = supabase.from("asana_status_map").delete().eq("secao_normalizada", secaoNormalizada);
    const { error } =
      escopo === "ministerio" && ministryId
        ? await query.eq("ministry_id", ministryId)
        : await query.is("ministry_id", null);

    if (error) return { error: `Não consegui remover a regra: ${error.message}` };
    revalidatePath("/dashboard/admin/asana");
    return { error: null };
  }

  if (!STATUS_VALIDOS.has(status)) {
    return { error: "Status inválido." };
  }

  const alvoMinistry = escopo === "ministerio" && ministryId ? ministryId : null;

  // Upsert manual: os índices únicos da 0031 são parciais (um pra regra
  // global, outro pra regra de ministério), e o onConflict do PostgREST
  // não sabe escolher entre eles.
  const existente = supabase
    .from("asana_status_map")
    .select("id")
    .eq("secao_normalizada", secaoNormalizada);

  const { data: achado } = alvoMinistry
    ? await existente.eq("ministry_id", alvoMinistry).maybeSingle()
    : await existente.is("ministry_id", null).maybeSingle();

  const { error } = achado
    ? await supabase
        .from("asana_status_map")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", achado.id)
    : await supabase
        .from("asana_status_map")
        .insert({ ministry_id: alvoMinistry, secao_normalizada: secaoNormalizada, status });

  if (error) return { error: `Não consegui salvar: ${error.message}` };

  revalidatePath("/dashboard/admin/asana");
  return { error: null };
}

/** Remove uma regra global órfã (coluna que não existe mais em quadro nenhum). */
export async function removerRegraGlobal(formData: FormData): Promise<Resultado> {
  await requireComunicacao();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Regra não identificada." };

  const supabase = await createClient();
  const { error } = await supabase.from("asana_status_map").delete().eq("id", id).is("ministry_id", null);

  if (error) return { error: `Não consegui remover: ${error.message}` };

  revalidatePath("/dashboard/admin/asana");
  return { error: null };
}
