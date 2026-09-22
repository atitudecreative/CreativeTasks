"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/ministries";
import { conferir } from "@/lib/data/erros";

export async function addComment(demandId: string, formData: FormData): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sessão expirada. Atualize a página e faça login de novo." };

  const corpo = String(formData.get("corpo") ?? "").trim();
  if (!corpo) return { error: "Escreve alguma coisa antes de enviar." };

  const supabase = await createClient();
  const { error } = await supabase.from("demand_comments").insert({
    demand_id: demandId,
    author_id: user.id,
    corpo,
  });

  if (error) {
    // RLS bloqueia (sem acesso à demanda) cai aqui também — mensagem
    // genérica, já que o motivo real (sem permissão) não deve vazar.
    return { error: "Não consegui salvar o comentário. Tenta de novo." };
  }

  revalidatePath(`/dashboard/demandas/${demandId}`);
  return { error: null };
}

export async function deleteComment(demandId: string, commentId: string): Promise<void> {
  const supabase = await createClient();
  // RLS já garante que só o autor ou Comunicação consegue apagar (policy
  // "demand_comments: apagar próprio ou Comunicação"). O `.select()` é
  // que revela o resultado: DELETE barrado por policy não devolve erro,
  // só não casa nenhuma linha — sem pedir a linha de volta, apagar o
  // comentário de outra pessoa parecia ter funcionado até o F5.
  const { data, error } = await supabase
    .from("demand_comments")
    .delete()
    .eq("id", commentId)
    .select("id");

  conferir("apagar o comentário", error);
  if (!data || data.length === 0) {
    throw new Error("Você só pode apagar os próprios comentários.");
  }

  revalidatePath(`/dashboard/demandas/${demandId}`);
}
