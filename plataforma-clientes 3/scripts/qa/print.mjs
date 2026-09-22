/* =========================================================================
   UM PRINT DE UMA TELA
   -------------------------------------------------------------------------
   A varredura (varredura.mjs) passa por tudo e reprova o que está errado.
   Isto aqui é o contrário: uma tela só, para OLHAR enquanto se mexe nela.

   Uso, com o servidor de pé (QA_MOCK=1 npm start):

     node scripts/qa/print.mjs /dashboard saida.png
     node scripts/qa/print.mjs /dashboard/campanhas saida.png 390 844 dark

   Além do print, reporta rolagem horizontal e erro de console — os dois
   defeitos que não aparecem numa imagem.
   ========================================================================= */
import { chromium } from "playwright";

const [rota, arquivo, largura = "1440", altura = "900", tema = "light"] = process.argv.slice(2);

if (!rota || !arquivo) {
  console.error("uso: node scripts/qa/print.mjs <rota> <arquivo.png> [largura] [altura] [light|dark]");
  process.exit(1);
}

const base = process.env.QA_BASE ?? "http://localhost:3100";
const navegador = await chromium.launch(
  process.env.QA_CHROMIUM ? { executablePath: process.env.QA_CHROMIUM } : {}
);
const contexto = await navegador.newContext({
  viewport: { width: +largura, height: +altura },
  colorScheme: tema,
});
const pagina = await contexto.newPage();

const erros = [];
pagina.on("console", (m) => m.type() === "error" && erros.push(m.text()));
pagina.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));

await pagina.goto(base + rota, { waitUntil: "networkidle", timeout: 60000 });
// Os gráficos animam ao entrar; espera assentar antes de fotografar.
await pagina.waitForTimeout(900);

const medidas = await pagina.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));
await pagina.screenshot({ path: arquivo, fullPage: true });

if (medidas.scrollWidth > medidas.innerWidth + 1) {
  console.log(`ROLAGEM HORIZONTAL: ${medidas.scrollWidth} > ${medidas.innerWidth}`);
}
for (const e of erros) console.log("ERRO:", e.slice(0, 300));
console.log("ok", arquivo);

await navegador.close();
