/* =========================================================================
   VARREDURA VISUAL
   -------------------------------------------------------------------------
   Abre cada tela em quatro larguras e nos dois temas, e reprova o que uma
   revisão a olho deixa passar:

   - erro no console do navegador,
   - rolagem horizontal na página (scrollWidth > innerWidth) — o defeito
     que mais aparece em telas de dado, e o mais fácil de não notar no
     desktop onde tudo cabe,
   - elemento que transborda a largura do viewport, com o seletor de quem
     transbordou,
   - alvo de toque menor que 24px em telas de celular.

   Uso: com o servidor de pé (QA_MOCK=1 npm start), `node scripts/qa/varredura.mjs`.
   ========================================================================= */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.QA_BASE ?? "http://localhost:3100";
const SAIDA = "/tmp/qa-prints";

const TELAS = [
  ["inicio", "/dashboard"],
  ["demandas", "/dashboard/demandas"],
  ["demanda-detalhe", "/dashboard/demandas/dem-0"],
  ["campanhas", "/dashboard/campanhas"],
  ["campanha-detalhe", "/dashboard/campanhas/camp-1"],
  ["entregas", "/dashboard/entregas"],
  ["acesso", "/dashboard/acesso"],
  ["admin", "/dashboard/admin"],
  ["admin-campanhas", "/dashboard/admin/campanhas-pendentes"],
  ["admin-campanha-editar", "/dashboard/admin/campanhas-pendentes/camp-1"],
  ["admin-ministerios", "/dashboard/admin/ministerios"],
  ["admin-ministerio-editar", "/dashboard/admin/ministerios/min-1"],
  ["admin-usuarios", "/dashboard/admin/usuarios"],
  ["admin-asana", "/dashboard/admin/asana"],
  ["login", "/login"],
];

// Recorte da varredura. Trabalhando página por página, varrer as quinze
// telas a cada ajuste é desperdício (e, num ambiente apertado, o navegador
// chega a ser morto por falta de memória no meio).
//   QA_TELAS=demanda-detalhe node scripts/qa/varredura.mjs
const FILTRO = (process.env.QA_TELAS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TELAS_DA_VEZ = FILTRO.length > 0 ? TELAS.filter(([nome]) => FILTRO.includes(nome)) : TELAS;

if (FILTRO.length > 0 && TELAS_DA_VEZ.length === 0) {
  console.error(`Nenhuma tela chamada ${FILTRO.join(", ")}. Conhecidas: ${TELAS.map(([n]) => n).join(", ")}`);
  process.exit(1);
}

const LARGURAS = [
  ["celular", 390, 844],
  ["tablet", 768, 1024],
  ["notebook", 1024, 768],
  ["desktop", 1440, 900],
];

// Ruído conhecido do ambiente de QA, não defeito da tela.
const IGNORAR = [/favicon/i, /QA_MOCK/i, /Download the React DevTools/i];

const achados = [];
function anotar(gravidade, tela, largura, tema, texto) {
  achados.push({ gravidade, tela, largura, tema, texto });
}

// O Chromium pré-instalado do ambiente pode ser de um build diferente do
// que esta versão do Playwright baixaria. QA_CHROMIUM aponta para ele.
const navegador = await chromium.launch(
  process.env.QA_CHROMIUM ? { executablePath: process.env.QA_CHROMIUM } : {}
);
mkdirSync(SAIDA, { recursive: true });

for (const [nomeLargura, w, h] of LARGURAS) {
  for (const tema of ["light", "dark"]) {
    const contexto = await navegador.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      colorScheme: tema,
    });
    const pagina = await contexto.newPage();

    for (const [nomeTela, rota] of TELAS_DA_VEZ) {
      const erros = [];
      pagina.on("console", (m) => {
        if (m.type() === "error" && !IGNORAR.some((r) => r.test(m.text()))) erros.push(m.text());
      });
      pagina.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));

      const resposta = await pagina.goto(BASE + rota, { waitUntil: "networkidle", timeout: 30000 });
      if (!resposta || resposta.status() >= 400) {
        anotar("ERRO", nomeTela, nomeLargura, tema, `HTTP ${resposta?.status()}`);
        continue;
      }
      // Os gráficos animam ao entrar; espera a animação assentar antes de medir.
      await pagina.waitForTimeout(700);

      const medidas = await pagina.evaluate(() => {
        const doc = document.documentElement;
        const larguraViewport = window.innerWidth;

        const transbordando = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > larguraViewport + 1 || r.left < -1) {
            const est = getComputedStyle(el);
            // Elemento dentro de um contêiner que rola na horizontal de
            // propósito (tabela larga) não é defeito.
            let pai = el.parentElement, intencional = false;
            while (pai) {
              const pe = getComputedStyle(pai);
              if (pe.overflowX === "auto" || pe.overflowX === "scroll") { intencional = true; break; }
              pai = pai.parentElement;
            }
            if (intencional || est.position === "fixed") continue;
            transbordando.push({
              seletor: el.tagName.toLowerCase() +
                (el.className && typeof el.className === "string"
                  ? "." + el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".")
                  : ""),
              direita: Math.round(r.right),
              texto: (el.textContent ?? "").trim().slice(0, 60),
            });
          }
        }

        const alvosPequenos = [];
        if (larguraViewport <= 480) {
          for (const el of document.querySelectorAll("button, a, [role=button], input, select")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            // Caixa de seleção dentro de um <label> não precisa ter 24px
            // sozinha: clicar no rótulo aciona o controle, então o alvo
            // real é o rótulo. Mede ele quando existe.
            const rotulo = el.closest("label");
            const alvo = rotulo && (el.tagName === "INPUT" || el.tagName === "SELECT")
              ? rotulo.getBoundingClientRect()
              : r;
            if (alvo.height < 24 || alvo.width < 24) {
              alvosPequenos.push({
                seletor: el.tagName.toLowerCase(),
                tamanho: `${Math.round(alvo.width)}x${Math.round(alvo.height)}`,
                texto: (el.textContent ?? "").trim().slice(0, 40),
              });
            }
          }
        }

        return {
          scrollWidth: doc.scrollWidth,
          innerWidth: larguraViewport,
          transbordando: transbordando.slice(0, 6),
          alvosPequenos: alvosPequenos.slice(0, 6),
        };
      });

      if (medidas.scrollWidth > medidas.innerWidth + 1) {
        anotar("ERRO", nomeTela, nomeLargura, tema,
          `rolagem horizontal: scrollWidth ${medidas.scrollWidth} > viewport ${medidas.innerWidth}`);
      }
      for (const t of medidas.transbordando) {
        anotar("ERRO", nomeTela, nomeLargura, tema,
          `transborda até ${t.direita}px: ${t.seletor} — "${t.texto}"`);
      }
      for (const a of medidas.alvosPequenos) {
        anotar("AVISO", nomeTela, nomeLargura, tema,
          `alvo de toque ${a.tamanho}: <${a.seletor}> "${a.texto}"`);
      }
      for (const e of erros) anotar("ERRO", nomeTela, nomeLargura, tema, `console: ${e}`);

      if (tema === "light") {
        await pagina.screenshot({
          path: `${SAIDA}/${nomeLargura}-${nomeTela}.png`,
          fullPage: nomeLargura === "desktop",
        });
      }
      pagina.removeAllListeners("console");
      pagina.removeAllListeners("pageerror");
    }

    await contexto.close();
  }
}

await navegador.close();

const erros = achados.filter((a) => a.gravidade === "ERRO");
const avisos = achados.filter((a) => a.gravidade === "AVISO");

// Agrupa achados idênticos que aparecem em vários temas/larguras.
function resumir(lista) {
  const mapa = new Map();
  for (const a of lista) {
    const chave = `${a.tela}|${a.texto}`;
    const atual = mapa.get(chave) ?? { ...a, onde: new Set() };
    atual.onde.add(`${a.largura}/${a.tema}`);
    mapa.set(chave, atual);
  }
  return [...mapa.values()];
}

console.log(`\nprints em ${SAIDA}\n`);
for (const [titulo, lista] of [["ERROS", resumir(erros)], ["AVISOS", resumir(avisos)]]) {
  console.log(`===== ${titulo} (${lista.length}) =====`);
  for (const a of lista) {
    console.log(`  [${a.tela}] ${a.texto}`);
    console.log(`      em: ${[...a.onde].join(", ")}`);
  }
  console.log("");
}
process.exit(erros.length > 0 ? 1 : 0);
