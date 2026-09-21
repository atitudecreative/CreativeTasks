import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireComunicacao } from "@/lib/data/ministries";

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  papelGlobal: string;
  memberships: { ministryId: string; ministryName: string; role: string }[];
};

// Lista TODAS as contas do Supabase Auth com service role — ou seja,
// ignorando RLS. Antes, a garantia de que só a Comunicação chegava aqui
// era um comentário pedindo pro chamador ter feito requireComunicacao()
// antes. O único chamador de hoje faz, mas comentário não é controle de
// acesso: bastava alguém montar uma rota nova esquecendo a linha pra
// expor e-mail de todo mundo.
//
// A checagem agora mora dentro da função. requireComunicacao() redireciona
// quem não é Comunicação, então não há caminho de retorno com dados.
// Defesa em profundidade: o chamador pode continuar chamando antes, e
// custa nada — getCurrentUser já é cacheado por request.
export const listUsersForAdmin = cache(async (): Promise<AdminUserRow[]> => {
  await requireComunicacao();

  const admin = createAdminClient();

  const [{ data: authData, error: authError }, { data: profiles }, { data: memberships }] =
    await Promise.all([
      admin.auth.admin.listUsers({ perPage: 200 }),
      admin.from("profiles").select("id, full_name, papel_global"),
      admin.from("ministry_members").select("user_id, role, ministries(id, name)"),
    ]);

  if (authError) {
    console.error("Erro ao listar usuários:", authError.message);
    return [];
  }

  return authData.users
    .map((u) => {
      const profile = profiles?.find((p) => p.id === u.id);
      const userMemberships = (memberships ?? [])
        .filter((m) => m.user_id === u.id)
        .map((m) => {
          const ministry = m.ministries as unknown as { id: string; name: string } | null;
          return {
            ministryId: ministry?.id ?? "",
            ministryName: ministry?.name ?? "—",
            role: m.role as string,
          };
        });

      return {
        id: u.id,
        email: u.email ?? "—",
        fullName: profile?.full_name ?? null,
        papelGlobal: profile?.papel_global ?? "nenhum",
        memberships: userMemberships,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
});
