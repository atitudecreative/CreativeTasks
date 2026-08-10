import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="bg-cream-50 font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
