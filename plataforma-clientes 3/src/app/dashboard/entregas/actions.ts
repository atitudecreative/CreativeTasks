"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/ministries";
import { hoje } from "@/lib/dates";

export async function createDeliverable(
  ministryId: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sessão expirada. Atualize a página e faça login de novo." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const linkPrincipal = String(formData.get("link_principal") ?? "").trim();
  if (!titulo) return { error: "Dá um título pra entrega." };
  if (!linkPrincipal) return { error: "Precisa de um link (Drive, YouTube, etc.)." };

  const tipoArquivo = String(formData.get("tipo_arquivo") ?? "").trim() || null;
  const versao = String(formData.get("versao") ?? "").trim() || null;
  const campaignId = String(formData.get("campaign_id") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "rascunho");

  // Links complementares: um por linha, campo simples de textarea — bem
  // mais fácil de preencher do que ir adicionando item por item.
  const linksComplementares = String(formData.get("links_complementares") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase.from("deliverables").insert({
    ministry_id: ministryId,
    titulo,
    tipo_arquivo: tipoArquivo,
    versao,
    status,
    campaign_id: campaignId,
    link_principal: linkPrincipal,
    links_complementares: linksComplementares,
    // Data de hoje em Brasília. Com toISOString() a entrega registrada
    // depois das 21h ficava com a data do dia seguinte.
    data_entrega: hoje(),
    autor_id: user.id,
  });

  if (error) {
    return { error: "Não consegui salvar a entrega. Confere se você tem permissão pra isso." };
  }

  revalidatePath("/dashboard/entregas");
  if (campaignId) revalidatePath(`/dashboard/campanhas/${campaignId}`);
  return { error: null };
}

// Status que uma Server Action aceita receber. O tipo do TypeScript some
// na compilação: quem chama a ação é o navegador, e o argumento chega
// serializado como qualquer outro dado de entrada. Sem esta lista, um
// valor arbitrário ia direto pro UPDATE.
const STATUS_ACEITOS = new Set(["aprovado", "rascunho", "para_aprovacao"]);

// `aprovador` do ministério (ou Comunicação) usa isso — a policy de RLS
// "deliverables: aprovador decide" (migration 0022) é quem garante de
// verdade que só quem pode mexer consegue.
//
// Lança quando não dá certo, e o cartão de entrega (DeliverableCard) já
// tem o try/catch que transforma isso num toast de erro. Antes esta função
// engolia tudo: quem não tinha permissão clicava em "Aprovar", via o toast
// verde de sucesso e nada acontecia.
export async function setDeliverableStatus(
  deliverableId: string,
  status: "aprovado" | "rascunho" | "para_aprovacao"
): Promise<void> {
  if (!STATUS_ACEITOS.has(status)) {
    throw new Error("Status de entrega inválido.");
  }

  const supabase = await createClient();

  // O `.select()` aqui não é enfeite. UPDATE barrado por RLS não devolve
  // erro nenhum no Supabase — a policy só faz a linha não casar, e a
  // resposta é um sucesso sem nada dentro. Pedir a linha de volta é o que
  // distingue "atualizei" de "não tinha permissão".
  const { data, error } = await supabase
    .from("deliverables")
    .update({ status })
    .eq("id", deliverableId)
    .select("id");

  if (error) {
    throw new Error("Não foi possível atualizar a entrega.");
  }
  if (!data || data.length === 0) {
    throw new Error("Você não tem permissão para mudar o status desta entrega.");
  }

  revalidatePath("/dashboard/entregas");
}
