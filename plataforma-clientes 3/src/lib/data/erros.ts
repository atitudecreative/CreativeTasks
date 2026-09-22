/* =========================================================================
   FALHA DE LEITURA — "vazio" e "não carregou" são coisas diferentes
   -------------------------------------------------------------------------
   A camada de dados inteira seguia o mesmo padrão:

       if (error) {
         console.error("Erro ao buscar X:", error.message);
         return [];
       }

   Vinte e quatro funções assim. O efeito na tela: uma indisponibilidade do
   banco, uma policy de RLS negando, um timeout — qualquer falha — vira uma
   lista vazia, e a interface responde com o estado vazio que ela já tem
   pronto: "Nenhuma demanda ainda", "Nenhum arquivo registrado".

   O usuário lê isso como um fato sobre o trabalho dele. Está errado, e é o
   pior tipo de erro que uma plataforma de prestação de contas pode cometer:
   a tela afirma com confiança que não há nada, quando a verdade é que ela
   não conseguiu perguntar. Ninguém recarrega uma página que parece ter
   carregado.

   A partir daqui, leitura que a tela PRECISA para fazer sentido lança. O
   Next leva isso para a fronteira de erro mais próxima (src/app/dashboard/
   error.tsx), que diz o que aconteceu e oferece "Tentar de novo" — com a
   navegação inteira de pé.

   Leitura ACESSÓRIA (comparações, métricas de mídia num painel lateral)
   não deve derrubar a tela: essa usa `Carga<T>` e a tela mostra, naquele
   painel só, que o dado não veio.
   ========================================================================= */

export class ErroDeCarregamento extends Error {
  readonly recurso: string;

  constructor(recurso: string, causa: string) {
    // A mensagem fica no log do servidor. O que chega ao navegador é o
    // texto da fronteira de erro mais o digest — detalhe de policy ou de
    // schema não deve vazar pro cliente.
    super(`Não foi possível carregar ${recurso}: ${causa}`);
    this.name = "ErroDeCarregamento";
    this.recurso = recurso;
  }
}

type ErroSupabase = { message: string } | null;

/** Lança quando a leitura é essencial para a tela fazer sentido. */
export function falhaAoCarregar(recurso: string, error: ErroSupabase): never {
  throw new ErroDeCarregamento(recurso, error?.message ?? "motivo desconhecido");
}

/* -------------------------------------------------------------------------
   Leitura acessória
   ------------------------------------------------------------------------- */

export type Carga<T> =
  | { ok: true; dados: T }
  | { ok: false; recurso: string };

export function carregado<T>(dados: T): Carga<T> {
  return { ok: true, dados };
}

export function naoCarregou<T>(recurso: string, error: ErroSupabase): Carga<T> {
  console.error(`Não foi possível carregar ${recurso}:`, error?.message ?? "motivo desconhecido");
  return { ok: false, recurso };
}

/** Valor quando veio, `fallback` quando não — para quem só precisa seguir. */
export function ou<T>(carga: Carga<T>, fallback: T): T {
  return carga.ok ? carga.dados : fallback;
}

/* -------------------------------------------------------------------------
   Escrita
   -------------------------------------------------------------------------
   O mesmo problema do outro lado. Vinte ações de servidor faziam

       await supabase.from("campaigns").delete().eq("id", id);
       revalidatePath(...);

   sem olhar o resultado. Se a policy negasse, se a constraint recusasse,
   se a conexão caísse — a página revalidava, a linha continuava lá e
   ninguém dizia nada. A pessoa clica de novo. E de novo.

   Lançar leva o caso para a fronteira de erro, que diz que não deu e
   oferece tentar de novo. Formulário que já devolve `{ error }` para a
   tela continua fazendo isso — ali a mensagem fica ao lado do campo, que
   é melhor; isto aqui é para a ação que não tem para onde responder.
   ------------------------------------------------------------------------- */

export class ErroAoSalvar extends Error {
  constructor(acao: string, causa: string) {
    super(`Não foi possível ${acao}: ${causa}`);
    this.name = "ErroAoSalvar";
  }
}

/** Lança se a escrita falhou. Devolve nada quando deu certo. */
export function conferir(acao: string, error: ErroSupabase): void {
  if (error) throw new ErroAoSalvar(acao, error.message);
}
