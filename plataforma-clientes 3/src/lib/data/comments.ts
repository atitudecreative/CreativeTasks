import { createClient } from "@/lib/supabase/server";

export type DemandComment = {
  id: string;
  demand_id: string;
  corpo: string;
  created_at: string;
  authorId: string | null;
  authorName: string;
};

// Comentários de uma demanda, mais antigo primeiro (like um fio de
// conversa). O nome do autor vem de um join com profiles — comentário de
// usuário removido (author_id null, ON DELETE SET NULL) aparece como
// "Usuário removido" em vez de sumir.
export async function getCommentsForDemand(demandId: string): Promise<DemandComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demand_comments")
    .select("id, demand_id, corpo, created_at, author_id, profiles(full_name)")
    .eq("demand_id", demandId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar comentários:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string | null } | null;
    return {
      id: row.id,
      demand_id: row.demand_id,
      corpo: row.corpo,
      created_at: row.created_at,
      authorId: row.author_id,
      authorName: profile?.full_name ?? "Usuário removido",
    };
  });
}
