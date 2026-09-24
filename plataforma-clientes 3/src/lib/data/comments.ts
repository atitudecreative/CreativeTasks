import { createClient } from "@/lib/supabase/server";
import { falhaAoCarregar } from "./erros";

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

  // Lista vazia por falha de leitura viraria "Nenhum comentário ainda" —
  // e alguém responderia de novo achando que a mensagem não foi.
  if (error) {
    falhaAoCarregar("a conversa desta demanda", error);
  }

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string | null } | null;
    return {
      id: row.id,
      demand_id: row.demand_id,
      corpo: row.corpo,
      created_at: row.created_at,
      authorId: row.author_id,
      // Três casos diferentes, e antes os três viravam "Usuário removido":
      // sem author_id é conta apagada (ON DELETE SET NULL); com conta mas
      // sem nome preenchido a pessoa continua lá — dizer que ela foi
      // removida é falso, e ela pode estar lendo a própria mensagem.
      authorName: profile?.full_name ?? (row.author_id ? "Usuário sem nome" : "Usuário removido"),
    };
  });
}
