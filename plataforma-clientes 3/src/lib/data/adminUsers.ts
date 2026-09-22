import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireComunicacao } from "@/lib/data/ministries";
import { falhaAoCarregar } from "./erros";

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

  // A API de Auth do Supabase pagina. Antes isto pedia uma página de 200 e
  // parava por aí: a partir da conta 201 a pessoa simplesmente não existia
  // na tela de usuários, sem aviso nenhum — e um "usuário não encontrado"
  // que na verdade é "lista cortada" manda alguém criar a conta de novo.
  // O teto de 50 páginas é só uma trava contra laço infinito se a API
  // mudar de contrato: 10.000 contas está muito além desta plataforma.
  async function todasAsContas() {
    const contas: { id: string; email?: string }[] = [];
    for (let pagina = 1; pagina <= 50; pagina++) {
      const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
      if (error) falhaAoCarregar("a lista de usuários", error);
      const lote = data?.users ?? [];
      contas.push(...lote);
      if (lote.length < 200) break;
    }
    return contas;
  }

  const [contas, { data: profiles, error: profilesError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      todasAsContas(),
      admin.from("profiles").select("id, full_name, papel_global"),
      admin.from("ministry_members").select("user_id, role, ministries(id, name)"),
    ]);

  // Papel e vínculos decidem o que cada linha oferece de ação. Vir vazio
  // por falha de leitura mostraria todo mundo como "sem papel global" e
  // sem nenhum ministério.
  if (profilesError) falhaAoCarregar("os perfis dos usuários", profilesError);
  if (membershipsError) falhaAoCarregar("os vínculos dos usuários", membershipsError);

  // Índices em vez de .find()/.filter() dentro do .map(): eram duas
  // varreduras da lista inteira por usuário.
  const perfilPorId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const vinculosPorUsuario = new Map<string, AdminUserRow["memberships"]>();
  for (const m of memberships ?? []) {
    const ministry = m.ministries as unknown as { id: string; name: string } | null;
    const lista = vinculosPorUsuario.get(m.user_id) ?? [];
    lista.push({
      ministryId: ministry?.id ?? "",
      ministryName: ministry?.name ?? "—",
      role: m.role as string,
    });
    vinculosPorUsuario.set(m.user_id, lista);
  }

  return contas
    .map((u) => {
      const profile = perfilPorId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "—",
        fullName: profile?.full_name ?? null,
        papelGlobal: profile?.papel_global ?? "nenhum",
        memberships: vinculosPorUsuario.get(u.id) ?? [],
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email, "pt-BR"));
});
