/* =========================================================================
   BUSCA POR TEXTO — uma normalização só
   -------------------------------------------------------------------------
   Esta função estava copiada em oito arquivos (explorador de demandas, de
   entregas, de campanhas, de usuários, de ministérios, o mapeamento do
   Asana, a paleta de comandos e o seletor de ministério), sempre igual e
   sempre escrita à mão. Duplicação assim não é só feiúra: basta uma cópia
   ficar para trás numa correção e a busca passa a se comportar diferente
   de tela para tela, sem que ninguém perceba.

   Uma diferença em relação às cópias: a faixa de acentos vinha escrita com
   os caracteres combinantes LITERAIS dentro do `[...]`. Funciona, mas são
   bytes invisíveis num arquivo de código — qualquer ferramenta que
   normalize o arquivo (um editor, um formatador, um patch mal aplicado)
   apaga a busca por acento sem deixar rastro no diff. Aqui a faixa vai
   escapada, como ̀-ͯ, que é a mesma coisa e se lê.
   ========================================================================= */

const ACENTOS = /[̀-ͯ]/g;

/** Minúsculas, sem acento, sem espaço nas pontas. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(ACENTOS, "").toLowerCase().trim();
}
