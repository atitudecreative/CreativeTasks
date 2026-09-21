import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { getEffectiveTheme, buildThemeCssVars } from "@/lib/data/theme";
import { ThemeScript } from "@/components/ThemeScript";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Mono só pros rótulos, identificadores e números — não carrega o
// arquivo inteiro: dois pesos bastam.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Portal dos Ministérios | Atitude Creative",
    template: "%s · Portal dos Ministérios",
  },
  description:
    "Plataforma de acompanhamento e prestação de contas de campanhas, eventos e entregas da Atitude Creative.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A cor da barra do navegador no celular acompanha o tema — o script
  // anti-flash reescreve a meta tag depois de resolver claro/escuro.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getEffectiveTheme();
  const themeVars = buildThemeCssVars(theme);

  return (
    <html
      lang="pt-BR"
      // suppressHydrationWarning porque o ThemeScript escreve
      // data-theme no <html> antes do React hidratar — é intencional.
      suppressHydrationWarning
      className={`${inter.variable} ${plexMono.variable}`}
      style={themeVars as React.CSSProperties}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-canvas font-sans text-body text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
