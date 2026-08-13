import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_MINISTRY_COOKIE = "active_ministry_id";

export type Ministry = {
  id: string;
  name: string;
  slug: string;
  sigla: string | null;
  description: string | null;
  categoria: string;
  status: string;
};

// Versão completa, usada na tela de edição — inclui os campos de contato
// que a listagem não precisa carregar.
export type MinistryDetail = Ministry & {
  pastor_responsavel: string | null;
  ponto_focal_ministerio: string | null;
  ponto_focal_comunicacao: string | null;
  centro_custo: string | null;
};

export type MinistryWithCounts = Ministry & {
  memberCount: number;
  demandCount: number;
};

export type MinistryRole = "leitor" | "colaborador" | "aprovador" | "supervisor" | "atendimento";

export type MinistryMembership = {
  role: MinistryRole;
  ministry: Ministry;
};

export type CurrentUser = {
  id: string;
  fullName: string | null;
  papelGlobal: "nenhum" | "atendimento" | "gestor_comunicacao" | "administrador_tecnico";
};

// cache() do React memoiza por request (RSC): sem isso, layout.tsx e cada
// page.tsx chamavam getCurrentUser/getUserMemberships/getCurrentMinistry
// de novo cada um, duplicando 3-4 idas ao Supabase (auth.getUser + query)
// em toda navegação. Com cache(), a segunda chamada com os mesmos
// argumentos dentro do mesmo request reaproveita o resultado da primeira.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, papel_global")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    fullName: profile?.full_name ?? null,
    papelGlobal: (profile?.papel_global as CurrentUser["papelGlobal"]) ?? "nenhum",
  };
});

export function isComunicacaoGlobal(user: CurrentUser | null): boolean {
  return user?.papelGlobal === "gestor_comunicacao" || user?.papelGlobal === "administrador_tecnico";
}

// Todos os ministérios que o usuário pode acessar via vínculo direto
// (ministry_members). Quem tem papel_global de Comunicação enxerga
// todos os ministérios via RLS mesmo sem vínculo — para esses casos
// use getAllMinistries() para o seletor.
export const getUserMemberships = cache(async (): Promise<MinistryMembership[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("ministry_members")
    .select("role, ministries(id, name, slug, sigla, description, categoria, status)")
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao buscar vínculos de ministério:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.ministries)
    .map((row) => ({
      role: row.role as MinistryRole,
      ministry: row.ministries as unknown as Ministry,
    }));
});

export const getAllMinistries = cache(async (): Promise<Ministry[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ministries")
    .select("id, name, slug, sigla, description, categoria, status")
    .order("name");

  if (error) {
    console.error("Erro ao buscar ministérios:", error.message);
    return [];
  }

  return data ?? [];
});

// Lista pra tela de cadastro de ministérios: além dos campos básicos, traz
// quantos usuários e quantas demandas cada ministério tem — ajuda a
// Comunicação a decidir se faz sentido excluir/arquivar um cadastro antes
// de fazer isso (excluir é irreversível e apaga tudo em cascata).
export async function getAllMinistriesWithCounts(): Promise<MinistryWithCounts[]> {
  const supabase = await createClient();

  const [{ data: ministries, error }, { data: members }, { data: demands }] = await Promise.all([
    supabase
      .from("ministries")
      .select("id, name, slug, sigla, description, categoria, status")
      .order("name"),
    supabase.from("ministry_members").select("ministry_id"),
    supabase.from("demands").select("ministry_id"),
  ]);

  if (error) {
    console.error("Erro ao buscar ministérios:", error.message);
    return [];
  }

  const memberCounts = new Map<string, number>();
  for (const row of members ?? []) {
    memberCounts.set(row.ministry_id, (memberCounts.get(row.ministry_id) ?? 0) + 1);
  }
  const demandCounts = new Map<string, number>();
  for (const row of demands ?? []) {
    demandCounts.set(row.ministry_id, (demandCounts.get(row.ministry_id) ?? 0) + 1);
  }

  return (ministries ?? []).map((m) => ({
    ...m,
    memberCount: memberCounts.get(m.id) ?? 0,
    demandCount: demandCounts.get(m.id) ?? 0,
  }));
}

export async function getMinistryById(id: string): Promise<MinistryDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ministries")
    .select(
      "id, name, slug, sigla, description, categoria, status, pastor_responsavel, ponto_focal_ministerio, ponto_focal_comunicacao, centro_custo"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar ministério:", error.message);
    return null;
  }

  return data as unknown as MinistryDetail | null;
}

// Ministério "ativo" na sessão: respeita o seletor (cookie) quando o
// usuário tem acesso a mais de um ministério (PRD 7.1).
//
// `ministry` pode vir null mesmo com um resultado válido: é o caso de
// um usuário de Comunicação (vê tudo) mas que ainda não tem nenhum
// ministério cadastrado no banco. Esse caso não é "sem acesso" — só
// não tem ministério pra mostrar ainda, então quem chama isso decide o
// que fazer (normalmente: mandar pro painel administrativo).
export const getCurrentMinistry = cache(async (): Promise<{
  ministry: Ministry | null;
  role: MinistryRole | null;
  user: CurrentUser;
} | null> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const comunicacao = isComunicacaoGlobal(user);
  const memberships = await getUserMemberships();

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_MINISTRY_COOKIE)?.value;

  if (memberships.length > 0) {
    const active =
      memberships.find((m) => m.ministry.id === activeId) ?? memberships[0];
    return { ministry: active.ministry, role: active.role, user };
  }

  // Sem vínculo direto: só faz sentido ter um ministério "ativo" pra
  // quem é Comunicação (visão global) — nesse caso caímos no primeiro
  // ministério cadastrado, ou o escolhido no seletor.
  if (comunicacao) {
    const all = await getAllMinistries();
    if (all.length === 0) return { ministry: null, role: null, user };
    const active = all.find((m) => m.id === activeId) ?? all[0];
    return { ministry: active, role: null, user };
  }

  return null;
});

// Use isso nas páginas do lado ministério (Início, Demandas, Campanhas,
// Entregas, Meu acesso): garante um ministério de verdade ou manda o
// usuário pro lugar certo (login, se não tem acesso nenhum; painel
// administrativo, se é Comunicação mas ainda não tem ministério).
export async function requireMinistry(): Promise<{
  ministry: Ministry;
  role: MinistryRole | null;
  user: CurrentUser;
}> {
  const current = await getCurrentMinistry();
  if (!current) redirect("/login?erro=sem-ministerio");
  if (!current.ministry) redirect("/dashboard/admin");
  return { ministry: current.ministry, role: current.role, user: current.user };
}

// Use isso nas páginas e Server Actions administrativas (cadastro de
// ministério, criação de usuário etc.) — garante que quem está
// chamando é Comunicação, senão manda pro Início.
export async function requireComunicacao(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isComunicacaoGlobal(user)) redirect("/dashboard");
  return user;
}
