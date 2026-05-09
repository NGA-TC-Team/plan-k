"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/services/stores";

/**
 * Syncs the persisted theme mode to <html>'s class list.
 *
 * Handles four modes:
 *  - "dark" / "light" — applied directly
 *  - "system"         — follows OS matchMedia preference; re-checks on change
 *  - "auto"           — time-window based; re-checks every 60 s
 *
 * The pre-hydration inline script in app/layout.tsx avoids FOUC for dark/light
 * and partially for system/auto (see layout.tsx). This hook keeps everything in
 * sync after hydration and reacts to mode changes at runtime.
 */
export function ThemeSync() {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  // Apply resolved theme to <html> on every resolved-theme change.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // Set up reactive listeners that call _recompute() when the environment
  // changes (OS preference, clock tick, or mode/schedule update in the store).
  useEffect(() => {
    const recompute = () => useThemeStore.getState()._recompute();

    // --- OS preference listener (system mode) ---
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onMqlChange = () => {
      if (useThemeStore.getState().mode === "system") recompute();
    };
    mql.addEventListener("change", onMqlChange);

    // --- 1-minute clock tick (auto mode) ---
    const timer = setInterval(() => {
      if (useThemeStore.getState().mode === "auto") recompute();
    }, 60_000);

    // --- store subscription: recompute when mode or schedule changes ---
    // Vanilla Zustand subscribe receives full state; we compare the fields
    // that affect recompute to avoid redundant calls.
    let prevMode = useThemeStore.getState().mode;
    let prevStart = useThemeStore.getState().autoDarkStart;
    let prevEnd = useThemeStore.getState().autoDarkEnd;

    const unsubStore = useThemeStore.subscribe((s) => {
      if (
        s.mode !== prevMode ||
        s.autoDarkStart !== prevStart ||
        s.autoDarkEnd !== prevEnd
      ) {
        prevMode = s.mode;
        prevStart = s.autoDarkStart;
        prevEnd = s.autoDarkEnd;
        recompute();
      }
    });

    // Run once immediately to handle the case where the persisted mode needs
    // recomputing on mount (e.g. system/auto after a cold page load).
    recompute();

    return () => {
      mql.removeEventListener("change", onMqlChange);
      clearInterval(timer);
      unsubStore();
    };
  }, []);

  return null;
}
