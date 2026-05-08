"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/services/stores";

/**
 * Syncs the persisted theme to <html>'s class list. Mounted once near the
 * root so every route sees the right surface tokens. The pre-hydration
 * inline script in app/layout.tsx avoids the FOUC by setting the class
 * before React boots; this hook keeps it in sync after hydration.
 */
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);
  return null;
}
