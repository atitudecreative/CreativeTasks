"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireComunicacao } from "@/lib/data/ministries";

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
  await supabase.from("ministry_members").delete().eq("user_id", userId).eq("ministry_id", ministryId);

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
  await admin.auth.admin.deleteUser(userId);

  revalidatePath("/dashboard/admin/usuarios");
}
