import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel do Cliente",
  description: "Painel unificado com dados de Asana, Meta Ads e e-inscrição.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
