// Entregas ficam como LINK (Drive, YouTube etc.), nunca como arquivo
// hospedado no Supabase Storage — pra não gastar espaço de armazenamento.
// Isso aqui reconhece alguns formatos comuns de link pra mostrar uma
// prévia de verdade dentro do portal (em vez de só um texto "abrir
// entrega"); qualquer link que não bater com nenhum padrão conhecido cai
// no card genérico, que sempre funciona.
export type LinkPreview =
  // Drive: tenta mostrar a IMAGEM de verdade (thumbnail do próprio Drive,
  // funciona bem pra foto/carrossel/PDF), com o iframe de visualização do
  // Drive como reserva caso a miniatura não carregue (arquivo não é
  // imagem, ou não está compartilhado como "qualquer pessoa com o link").
  | { kind: "drive"; imageUrl: string; embedUrl: string }
  | { kind: "youtube"; embedUrl: string }
  | { kind: "image"; url: string }
  | { kind: "generic"; domain: string };

export function getLinkPreview(rawUrl: string): LinkPreview {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: "generic", domain: rawUrl };
  }

  // Google Drive: pega o ID do arquivo em qualquer um dos formatos comuns
  // de link (/file/d/{ID}/view, /open?id={ID}, /uc?id={ID}...) e monta
  // tanto a miniatura (imagem de verdade, via /thumbnail) quanto o
  // visualizador embutido (/preview, funciona pra qualquer tipo de
  // arquivo) — o componente que exibe decide qual usar primeiro.
  if (url.hostname.includes("drive.google.com")) {
    const fromPath = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    const fromQuery = url.searchParams.get("id") ?? undefined;
    const fileId = fromPath ?? fromQuery;
    if (fileId) {
      return {
        kind: "drive",
        imageUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      };
    }
  }

  // YouTube: watch?v=ID ou youtu.be/ID -> embed/ID.
  if (url.hostname.includes("youtube.com") && url.searchParams.get("v")) {
    return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${url.searchParams.get("v")}` };
  }
  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.replace("/", "");
    if (videoId) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${videoId}` };
  }

  // Link direto pra imagem (ex: export do Drive, ou CDN qualquer).
  if (/\.(png|jpe?g|gif|webp)$/i.test(url.pathname)) {
    return { kind: "image", url: rawUrl };
  }

  return { kind: "generic", domain: url.hostname.replace(/^www\./, "") };
}
