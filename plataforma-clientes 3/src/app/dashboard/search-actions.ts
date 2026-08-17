"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  type: "demanda" | "campanha";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

// Busca global (Cmd+K): usa o client autenticado normal, então o RLS já
// filtra sozinho pra só trazer demandas/campanhas que o usuário logado
// pode ver — não precisa repetir a lógica de "acesso por ministério" aqui.
export async function globalSearch(rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const supabase = await createClient();
  const term = `%${query}%`;

  const [{ data: demands }, { data: campaigns }] = await Promise.all([
    supabase
      .from("demands")
      .select("id, titulo, identificador, status")
      .or(`titulo.ilike.${term},identificador.ilike.${term}`)
      .limit(8),
    supabase
      .from("campaigns")
      .select("id, nome, tipo")
      .ilike("nome", term)
      .eq("publicada", true)
      .limit(8),
  ]);

  const results: SearchResult[] = [];

  for (const d of demands ?? []) {
    results.push({
      type: "demanda",
      id: d.id,
      title: d.titulo,
      subtitle: d.identificador ?? "Demanda",
      href: `/dashboard/demandas/${d.id}`,
    });
  }

  for (const c of campaigns ?? []) {
    results.push({
      type: "campanha",
      id: c.id,
      title: c.nome,
      subtitle: "Campanha ou evento",
      href: `/dashboard/campanhas/${c.id}`,
    });
  }

  return results;
}
