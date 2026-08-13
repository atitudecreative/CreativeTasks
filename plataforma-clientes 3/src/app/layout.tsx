import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getEffectiveTheme, buildThemeCssVars } from "@/lib/data/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal dos Ministérios | Atitude Creative",
  description: "Painel unificado com dados de Asana, Meta Ads e e-inscrição.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getEffectiveTheme();
  const themeVars = buildThemeCssVars(theme);

  return (
    <html lang="pt-BR" className={inter.variable} style={themeVars as React.CSSProperties}>
      <body className="bg-cream-50 font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
