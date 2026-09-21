// Script anti-flash do tema.
//
// Roda ANTES da primeira pintura (é um <script> síncrono no <head>), então
// a página já nasce no tema certo — sem aquele lampejo branco quando o
// usuário prefere escuro. Não dá pra fazer isso num useEffect: o efeito só
// roda depois de pintar.
//
// Ordem de decisão: escolha salva pelo usuário (localStorage) > preferência
// do sistema. O toggle no header escreve no localStorage e troca o
// atributo na hora.
export const THEME_STORAGE_KEY = "portal-theme";

const script = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var mode = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode === "dark" ? "#111110" : "#f7f6f4");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
