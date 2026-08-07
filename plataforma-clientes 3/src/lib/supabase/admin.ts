import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

// Cliente com a service role key: ignora RLS e tem acesso à API de
// administração de usuários do Supabase Auth (criar conta, etc.).
//
// USE SÓ EM SERVER ACTIONS / ROUTE HANDLERS, e sempre depois de checar
// que quem está chamando é Comunicação (isComunicacaoGlobal). Nunca
// importe isso em um Client Component — a service role key não pode
// vazar pro navegador.
export function createAdminClient() {
  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
