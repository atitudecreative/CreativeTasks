import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  papelGlobal: string;
  memberships: { ministryId: string; ministryName: string; role: string }[];
};

// Só chame isso depois de garantir (requireComunicacao) que quem está
// pedindo é Comunicação — usa a service role key, ignora RLS.
export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
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
}
