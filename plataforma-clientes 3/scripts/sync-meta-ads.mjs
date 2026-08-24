// Sincroniza campanhas do Meta Ads (Marketing API) pra dentro da tabela
// `meta_ad_campaigns` — traz alcance/impressões/cliques/investimento reais
// e tenta casar cada campanha do Meta com uma campanha/evento do portal
// pelo NOME (mesma normalização — trim + minúsculo — já usada pra tag do
// Asana virar campanha).
//
// Roda FORA do Next.js — é um script standalone pra ser executado
// manualmente ou por um agendador (cron, GitHub Actions, etc). Nunca é
// chamado a partir do navegador do cliente.
//
// Uso:
//   npm run sync:meta-ads
//
// Requer no .env.local (ou nas env vars do agendador):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   META_ACCESS_TOKEN       — token de um Usuário do Sistema (Business
//                             Manager), permissão ads_read. Token pessoal
//                             expira em 60 dias — evite.
//   META_AD_ACCOUNT_ID      — um ou mais IDs de conta de anúncio, sem o
//                             prefixo "act_" (ex: 1861881337886509). Mais
//                             de uma conta: separe por vírgula.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
  console.error(
    "Faltam variáveis de ambiente. Confira NEXT_PUBLIC_SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY, META_ACCESS_TOKEN e META_AD_ACCOUNT_ID no .env.local."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const META_API = "https://graph.facebook.com/v19.0";

async function fetchAllPages(initialUrl) {
  const results = [];
  let url = initialUrl;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Meta API retornou ${res.status}: ${body}`);
    }
    const json = await res.json();
    results.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }

  return results;
}

async function fetchCampaigns(adAccountId) {
  const url = new URL(`${META_API}/act_${adAccountId}/campaigns`);
  url.searchParams.set("fields", "id,name,status,start_time,stop_time");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", META_ACCESS_TOKEN);
  return fetchAllPages(url.toString());
}

// Um request só, com level=campaign, em vez de um request de insights por
// campanha — evita estourar limite de chamadas quando a conta tem muitas
// campanhas. `date_preset=maximum` pega o histórico inteiro da campanha.
async function fetchInsightsByCampaign(adAccountId) {
  const url = new URL(`${META_API}/act_${adAccountId}/insights`);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("fields", "campaign_id,reach,impressions,clicks,spend");
  url.searchParams.set("date_preset", "maximum");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", META_ACCESS_TOKEN);

  const rows = await fetchAllPages(url.toString());
  const map = new Map();
  for (const row of rows) map.set(row.campaign_id, row);
  return map;
}

// Mesmo mapa nome (minúsculo, sem espaço nas pontas) -> id já usado no
// sync do Asana, pra casar campanha do Meta com campanha do portal pelo
// nome.
async function loadCampaignMap() {
  const { data, error } = await supabase.from("campaigns").select("id, nome");
  if (error) throw new Error(`Erro ao buscar campanhas do portal: ${error.message}`);

  const map = new Map();
  for (const c of data ?? []) map.set(c.nome.trim().toLowerCase(), c.id);
  return map;
}

async function syncAdAccount(adAccountId, campaignMap) {
  console.log(`\n=== Conta de anúncios act_${adAccountId} ===`);

  const [campaigns, insightsByCampaign] = await Promise.all([
    fetchCampaigns(adAccountId),
    fetchInsightsByCampaign(adAccountId),
  ]);

  const { data: existingRows, error: existingError } = await supabase
    .from("meta_ad_campaigns")
    .select("meta_campaign_id, campaign_id, matched_manualmente")
    .eq("meta_ad_account_id", adAccountId);

  if (existingError) {
    throw new Error(`Erro ao ler campanhas já sincronizadas: ${existingError.message}`);
  }

  const existingByMetaId = new Map((existingRows ?? []).map((r) => [r.meta_campaign_id, r]));

  let matched = 0;
  let unmatched = 0;

  for (const c of campaigns) {
    const existing = existingByMetaId.get(c.id);
    const insight = insightsByCampaign.get(c.id);
    const key = c.name.trim().toLowerCase();

    // Vínculo feito à mão em /dashboard/admin/campanhas-pendentes nunca é
    // sobrescrito por um re-match automático — mesmo que o nome mude de
    // um lado só.
    const matchedManualmente = existing?.matched_manualmente ?? false;
    const campaignId = matchedManualmente ? existing.campaign_id : campaignMap.get(key) ?? null;

    if (campaignId) matched += 1;
    else unmatched += 1;

    const { error } = await supabase.from("meta_ad_campaigns").upsert(
      {
        meta_campaign_id: c.id,
        meta_ad_account_id: adAccountId,
        nome: c.name,
        status: c.status ?? null,
        campaign_id: campaignId,
        matched_manualmente: matchedManualmente,
        alcance: insight?.reach != null ? Number(insight.reach) : null,
        impressoes: insight?.impressions != null ? Number(insight.impressions) : null,
        cliques: insight?.clicks != null ? Number(insight.clicks) : null,
        investimento: insight?.spend != null ? Number(insight.spend) : null,
        data_inicio: c.start_time ? c.start_time.slice(0, 10) : null,
        data_termino: c.stop_time ? c.stop_time.slice(0, 10) : null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "meta_campaign_id" }
    );

    if (error) {
      console.warn(`  Não consegui salvar a campanha do Meta "${c.name}": ${error.message}`);
    }
  }

  console.log(
    `  ${campaigns.length} campanha(s) do Meta — ${matched} casada(s) com uma campanha do portal, ${unmatched} sem vínculo (link manual em Campanhas ativas).`
  );
}

async function main() {
  const adAccountIds = META_AD_ACCOUNT_ID.split(",").map((s) => s.trim()).filter(Boolean);
  const campaignMap = await loadCampaignMap();

  let hadError = false;

  for (const adAccountId of adAccountIds) {
    try {
      await syncAdAccount(adAccountId, campaignMap);
    } catch (err) {
      hadError = true;
      console.error(`Erro sincronizando a conta act_${adAccountId}:`, err.message);
    }
  }

  console.log(hadError ? "\nSync do Meta Ads terminou com erro(s) — veja acima." : "\nSync do Meta Ads concluído.");
  if (hadError) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Erro inesperado no sync do Meta Ads:", err);
  process.exitCode = 1;
});
