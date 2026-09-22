"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireComunicacao } from "@/lib/data/ministries";
import { conferir } from "@/lib/data/erros";
import { PAPEL_GLOBAL_OPTIONS, MINISTRY_ROLE_OPTIONS } from "@/lib/userOptions";

/* Papéis aceitos, conferidos em tempo de execução.
   O banco já tem CHECK nas duas colunas, então um valor inventado não
   entra — mas a mensagem que voltava pra tela era o texto cru da
   constraint do Postgres. Validar aqui devolve uma frase que a pessoa
   entende, e mantém a checagem perto de quem escreve com service role
   (que passa por cima de qualquer policy). */
const PAPEIS_GLOBAIS = new Set<string>(PAPEL_GLOBAL_OPTIONS.map((o) => o.value));
const PAPEIS_DE_MINISTERIO = new Set<string>(MINISTRY_ROLE_OPTIONS.map((o) => o.value));

export async function createUser(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const papelGlobal = String(formData.get("papelGlobal") ?? "nenhum");
  const ministryId = String(formData.get("ministryId") ?? "");
  const ministryRole = String(formData.get("ministryRole") ?? "");

  if (!email || !password) {
    return { error: "E-mail e senha são obrigatórios." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (!PAPEIS_GLOBAIS.has(papelGlobal)) {
    return { error: "Papel global inválido." };
  }
  if (ministryRole && !PAPEIS_DE_MINISTERIO.has(ministryRole)) {
    return { error: "Papel no ministério inválido." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Erro ao criar usuário." };
  }

  const userId = data.user.id;

  if (papelGlobal !== "nenhum") {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ papel_global: papelGlobal })
      .eq("id", userId);

    if (profileError) {
      return { error: `Usuário criado, mas houve erro ao definir o papel: ${profileError.message}` };
    }
  }

  if (ministryId && ministryRole) {
    const { error: membershipError } = await admin.from("ministry_members").insert({
      ministry_id: ministryId,
      user_id: userId,
      role: ministryRole,
    });

    if (membershipError) {
      return {
        error: `Usuário criado, mas houve erro ao vincular ao ministério: ${membershipError.message}`,
      };
    }
  }

  revalidatePath("/dashboard/admin/usuarios");
  return { error: null };
}

export async function addMembership(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const userId = String(formData.get("userId") ?? "");
  const ministryId = String(formData.get("ministryId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!userId || !ministryId || !role) {
    return { error: "Selecione usuário, ministério e papel." };
  }
  if (!PAPEIS_DE_MINISTERIO.has(role)) {
    return { error: "Papel no ministério inválido." };
  }

  // A policy "ministry_members: Comunicação gerencia vínculos" já
  // permite essa escrita pro papel_global de Comunicação — não precisa
  // da service role aqui.
  const supabase = await createClient();
  const { error } = await supabase.from("ministry_members").insert({
    ministry_id: ministryId,
    user_id: userId,
    role,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/usuarios");
  return { error: null };
}

// Muda o papel global de outro usuário. Não deixa a pessoa mudar o
// PRÓPRIO papel por aqui — evita que alguém se auto-rebaixe sem querer e
// perca o acesso à própria tela de administração.
export async function updateUserPapelGlobal(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const current = await requireComunicacao();

  const userId = String(formData.get("userId") ?? "");
  const papelGlobal = String(formData.get("papelGlobal") ?? "nenhum");

  if (!userId) {
    return { error: "Usuário inválido." };
  }
  if (userId === current.id) {
    return { error: "Não é possível alterar seu próprio papel por aqui — peça a outro administrador." };
  }
  if (!PAPEIS_GLOBAIS.has(papelGlobal)) {
    return { error: "Papel global inválido." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ papel_global: papelGlobal }).eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/usuarios");
  return { error: null };
}

// Troca o papel de um usuário já vinculado a um ministério (sem precisar
// remover e recriar o vínculo).
export async function updateMembershipRole(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireComunicacao();

  const userId = String(formData.get("userId") ?? "");
  const ministryId = String(formData.get("ministryId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!userId || !ministryId || !role) {
    return { error: "Dados inválidos." };
  }
  if (!PAPEIS_DE_MINISTERIO.has(role)) {
    return { error: "Papel no ministério inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ministry_members")
    .update({ role })
    .eq("user_id", userId)
    .eq("ministry_id", ministryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/usuarios");
  return { error: null };
}

// Desvincula um usuário de um ministério — ele deixa de ver/selecionar
// esse ministério, mas a conta continua existindo (e outros vínculos, se
// houver, continuam intactos).
export async function removeMembership(formData: FormData) {
  await requireComunicacao();

  const userId = String(formData.get("userId") ?? "");
  const ministryId = String(formData.get("ministryId") ?? "");
  if (!userId || !ministryId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("ministry_members")
    .delete()
    .eq("user_id", userId)
    .eq("ministry_id", ministryId);
  conferir("remover o vínculo", error);

  revalidatePath("/dashboard/admin/usuarios");
}

// Exclui a conta inteira (auth.users) — profiles e ministry_members do
// usuário são apagados em cascata pelo próprio banco. Não deixa excluir
// a própria conta por aqui.
export async function deleteUserAccount(formData: FormData) {
  const current = await requireComunicacao();

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === current.id) return;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  // Sem esta conferência, excluir uma conta que o Supabase recusou
  // devolvia a mesma tela recarregada, com a pessoa ainda na lista e
  // nenhuma explicação — e quem clicou tentava de novo.
  conferir("excluir a conta", error);

  revalidatePath("/dashboard/admin/usuarios");
}
