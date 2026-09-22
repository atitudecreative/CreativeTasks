import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // O segundo argumento entrega a instância de webpack que o Next usa
  // internamente — importar "webpack" do node_modules não funciona, o Next
  // traz a sua própria cópia compilada.
  webpack(config, { webpack }) {
    // QA visual sem banco (ver scripts/qa/README.md). Troca só o
    // transporte do Supabase; todo o resto da aplicação roda como em
    // produção. Sem a variável, nada aqui é registrado.
    //
    // NormalModuleReplacementPlugin em vez de resolve.alias porque o Next
    // resolve "@/..." com um plugin de resolução próprio (tsconfig paths)
    // que corre antes dos apelidos — o alias era simplesmente ignorado, e
    // em silêncio.
    if (process.env.QA_MOCK === "1") {
      const trocas = [
        [/^@\/lib\/supabase\/server$/, "scripts/qa/supabase-mock.ts"],
        [/^@\/lib\/supabase\/middleware$/, "scripts/qa/middleware-mock.ts"],
        [/^@\/lib\/supabase\/admin$/, "scripts/qa/supabase-mock.ts"],
      ];
      for (const [padrao, destino] of trocas) {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(padrao, (recurso) => {
            recurso.request = path.join(raiz, destino);
          })
        );
      }
    }
    return config;
  },
};

export default nextConfig;
