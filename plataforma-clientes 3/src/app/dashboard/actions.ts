"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_MINISTRY_COOKIE,
  getCurrentUser,
  getUserMemberships,
  getAllMinistries,
  isComunicacaoGlobal,
} from "@/lib/data/ministries";

// Valida no servidor que o ministryId enviado é um dos que o usuário
// logado realmente pode acessar antes de gravar o cookie — assim, mesmo
// que alguém manipule o <select> ou o form no navegador, não dá pra
// selecionar (nem persistir a seleção de) um ministério fora do vínculo
// da pessoa. Quem é Comunicação pode escolher qualquer um cadastrado.
export async function setActiveMinistry(formData: FormData) {
  const ministryId = String(formData.get("ministryId") ?? "");
  if (!ministryId) return;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const comunicacao = isComunicacaoGlobal(user);
  const allowedIds = comunicacao
    ? (await getAllMinistries()).map((m) => m.id)
    : (await getUserMemberships()).map((m) => m.ministry.id);

  if (!allowedIds.includes(ministryId)) {
    // Tentativa de selecionar um ministério fora do acesso do usuário —
    // ignora silenciosamente em vez de gravar o cookie.
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_MINISTRY_COOKIE, ministryId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}
