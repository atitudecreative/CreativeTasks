"use client";

import { useEffect, useState } from "react";
import { Icon, IconButton } from "@/components/ui";
import { THEME_STORAGE_KEY } from "./ThemeScript";

/* Alterna claro/escuro. O estado de verdade é o atributo data-theme no
   <html> (escrito pelo ThemeScript antes da primeira pintura); aqui só
   sincronizamos depois de montar, pra não divergir na hidratação. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#111110" : "#f7f6f4");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Modo privado / storage bloqueado: a troca vale só nesta aba.
    }
  }

  // Antes de montar, renderiza a casca sem ícone — evita piscar o ícone
  // errado por um frame.
  return (
    <IconButton
      label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      size="sm"
      onClick={toggle}
      className={className}
    >
      {theme === "dark" ? <Icon.Sun className="h-4 w-4" /> : <Icon.Moon className="h-4 w-4" />}
    </IconButton>
  );
}
