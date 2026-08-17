// Manda um e-mail semanal por ministério com o que está atrasado e o que
// está esperando resposta do ministério — pra quem não abre o portal
// todo dia ainda assim ficar sabendo do que precisa de atenção.
//
// Roda FORA do Next.js, igual o sync-asana.mjs — standalone, pensado pra
// rodar num Cron Job do Render (ex: toda segunda de manhã).
//
// Uso:
//   npm run send:weekly-digest
//
// Requer no .env.local (ou nas env vars do agendador):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY       -- gerado em resend.com (tem plano grátis)
//   DIGEST_FROM_EMAIL    -- ex: "Portal dos Ministérios <portal@atitudecreative.com.br>"
//                           precisa ser um domínio verificado no Resend
//   DIGEST_APP_URL        -- ex: "https://portal.atitudecreative.com.br" (sem barra no final)
//                           usado pra montar os links dentro do e-mail

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DIGEST_FROM_EMAIL = process.env.DIGEST_FROM_EMAIL;
const DIGEST_APP_URL = (process.env.DIGEST_APP_URL ?? "").replace(/\/$/, "");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !DIGEST_FROM_EMAIL || !DIGEST_APP_URL) {
  console.error(
    "Faltam variáveis de ambiente. Confira NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, " +
      "RESEND_API_KEY, DIGEST_FROM_EMAIL e DIGEST_APP_URL."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatDate(dateStr) {
  if (!dateStr) return "sem prazo";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

// Busca o e-mail de todo mundo de uma vez (paginado) — bem mais barato do
// que uma chamada de admin.auth.admin.getUserById() por membro.
async function loadAllUserEmails() {
  const emailById = new Map();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Erro ao listar usuários: ${error.message}`);

    for (const u of data.users) {
      if (u.email) emailById.set(u.id, u.email);
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return emailById;
}

function buildEmailHtml({ ministryName, atrasadas, aguardando, campanhasAtivasCount }) {
  const demandaLinha = (d) =>
    `<li style="margin-bottom:8px;">
      <a href="${DIGEST_APP_URL}/dashboard/demandas/${d.id}" style="color:#1d4ed8;text-decoration:none;font-weight:600;">
        ${escapeHtml(d.titulo)}
      </a>
      <div style="font-size:12px;color:#71717a;">prazo: ${formatDate(d.prazo_acordado)}</div>
    </li>`;

  const atrasadasHtml =
    atrasadas.length > 0
      ? `<h2 style="font-size:14px;color:#b91c1c;margin:20px 0 8px;">Atrasadas (${atrasadas.length})</h2>
         <ul style="padding-left:18px;margin:0;">${atrasadas.map(demandaLinha).join("")}</ul>`
      : "";

  const aguardandoHtml =
    aguardando.length > 0
      ? `<h2 style="font-size:14px;color:#92400e;margin:20px 0 8px;">Aguardando o ministério (${aguardando.length})</h2>
         <ul style="padding-left:18px;margin:0;">${aguardando.map(demandaLinha).join("")}</ul>`
      : "";

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#18181b;">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#a1a1aa;margin-bottom:4px;">
        Resumo semanal · Portal dos Ministérios
      </p>
      <h1 style="font-size:20px;margin:0 0 4px;">${escapeHtml(ministryName)}</h1>
      <p style="font-size:13px;color:#71717a;margin:0 0 8px;">
        ${campanhasAtivasCount} campanha(s)/evento(s) ativo(s) no momento.
      </p>
      ${atrasadasHtml}
      ${aguardandoHtml}
      <p style="margin-top:24px;">
        <a href="${DIGEST_APP_URL}/dashboard" style="color:#1d4ed8;text-decoration:none;font-weight:600;">
          Abrir o portal →
        </a>
      </p>
    </div>
  `;
}

async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: DIGEST_FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend retornou ${res.status}: ${body}`);
  }
}

async function main() {
  const [{ data: ministries, error: ministriesError }, emailById] = await Promise.all([
    supabase.from("ministries").select("id, name").eq("status", "ativo"),
    loadAllUserEmails(),
  ]);

  if (ministriesError) {
    throw new Error(`Erro ao buscar ministérios: ${ministriesError.message}`);
  }

  if (!ministries || ministries.length === 0) {
    console.log("Nenhum ministério ativo cadastrado. Nada a fazer.");
    return;
  }

  const today = new Date(new Date().toDateString());
  let hadError = false;
  let enviados = 0;
  let semNadaParaAvisar = 0;

  for (const ministry of ministries) {
    try {
      const [{ data: demands, error: demandsError }, { data: memberRows, error: membersError }, { data: campaignLinks }] =
        await Promise.all([
          supabase
            .from("demands")
            .select("id, titulo, status, prazo_acordado")
            .eq("ministry_id", ministry.id)
            .is("parent_demand_id", null)
            .not("status", "in", "(concluida,cancelada)"),
          supabase.from("ministry_members").select("user_id").eq("ministry_id", ministry.id),
          supabase
            .from("demand_campaigns")
            .select("campaign_id, demands!inner(ministry_id), campaigns!inner(saude, publicada)")
            .eq("demands.ministry_id", ministry.id)
            .eq("campaigns.publicada", true),
        ]);

      if (demandsError) throw new Error(demandsError.message);
      if (membersError) throw new Error(membersError.message);

      const atrasadas = (demands ?? []).filter(
        (d) => d.prazo_acordado && new Date(d.prazo_acordado) < today
      );
      const aguardando = (demands ?? []).filter(
        (d) => d.status === "aguardando_ministerio" && !atrasadas.includes(d)
      );

      if (atrasadas.length === 0 && aguardando.length === 0) {
        semNadaParaAvisar++;
        continue; // ninguém precisa de e-mail se não tem nada pendente
      }

      const campanhasAtivasCount = new Set(
        (campaignLinks ?? [])
          .filter((row) => (row.campaigns).saude !== "concluida")
          .map((row) => row.campaign_id)
      ).size;

      const recipients = Array.from(
        new Set((memberRows ?? []).map((m) => emailById.get(m.user_id)).filter(Boolean))
      );

      if (recipients.length === 0) {
        console.warn(`  Ministério "${ministry.name}" tem pendências mas nenhum membro com e-mail encontrado. Pulando.`);
        continue;
      }

      const html = buildEmailHtml({
        ministryName: ministry.name,
        atrasadas,
        aguardando,
        campanhasAtivasCount,
      });

      await sendEmail(
        recipients,
        `${atrasadas.length > 0 ? `⚠️ ${atrasadas.length} atrasada(s)` : "Resumo semanal"} · ${ministry.name}`,
        html
      );

      enviados++;
      console.log(`  Enviado pra ${ministry.name} (${recipients.length} destinatário(s)).`);
    } catch (err) {
      hadError = true;
      console.error(`  Erro ao processar ministério "${ministry.name}": ${err.message}`);
    }
  }

  console.log(
    `Resumo semanal concluído: ${enviados} e-mail(s) enviado(s), ${semNadaParaAvisar} ministério(s) sem pendência.`
  );

  if (hadError) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
