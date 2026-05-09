"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isInDarkWindow } from "./time-window";

/** Four theme modes. */
export type ThemeMode = "dark" | "light" | "system" | "auto";

/**
 * @deprecated Use ThemeMode instead. Kept for backwards-compat with any
 * external code that imported the old union type.
 */
export type Theme = "light" | "dark";

type ThemeState = {
  /** User preference — persisted to localStorage. */
  mode: ThemeMode;
  /** Resolved (applied) theme — computed from mode + environment. */
  resolvedTheme: "dark" | "light";
  /** Auto-mode: hour (0–23) at which dark mode begins. Default 18. */
  autoDarkStart: number;
  /** Auto-mode: hour (0–23) at which dark mode ends. Default 7. */
  autoDarkEnd: number;

  setMode: (m: ThemeMode) => void;
  setAutoSchedule: (start: number, end: number) => void;
  /**
   * Recomputes resolvedTheme from the current mode + environment.
   * Called by ThemeSync provider; kept internal by convention (_-prefix).
   */
  _recompute: () => void;

  /**
   * @deprecated Use setMode() instead.
   * Kept so existing call-sites don't break during the transition.
   */
  setTheme: (theme: "dark" | "light") => void;
  /**
   * Toggles between dark↔light only when mode is "dark" or "light".
   * No-op if mode is "system" or "auto".
   */
  toggleTheme: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeResolved(
  mode: ThemeMode,
  autoDarkStart: number,
  autoDarkEnd: number,
): "dark" | "light" {
  if (mode === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  if (mode === "auto") {
    const hour = new Date().getHours();
    return isInDarkWindow(hour, autoDarkStart, autoDarkEnd) ? "dark" : "light";
  }
  return mode;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      resolvedTheme: "dark",
      autoDarkStart: 18,
      autoDarkEnd: 7,

      setMode: (m) => {
        const { autoDarkStart, autoDarkEnd } = get();
        set({
          mode: m,
          resolvedTheme: computeResolved(m, autoDarkStart, autoDarkEnd),
        });
      },

      setAutoSchedule: (start, end) => {
        set({
          autoDarkStart: start,
          autoDarkEnd: end,
          resolvedTheme: computeResolved("auto", start, end),
        });
      },

      _recompute: () => {
        const { mode, autoDarkStart, autoDarkEnd } = get();
        set({
          resolvedTheme: computeResolved(mode, autoDarkStart, autoDarkEnd),
        });
      },

      // --- deprecated shims ---
      setTheme: (theme) => {
        set({ mode: theme, resolvedTheme: theme });
      },
      toggleTheme: () => {
        const { mode, resolvedTheme } = get();
        if (mode === "dark" || mode === "light") {
          const next = mode === "dark" ? "light" : "dark";
          set({ mode: next, resolvedTheme: next });
        } else {
          // system/auto: no-op (user must switch via setMode)
          void resolvedTheme;
        }
      },
    }),
    {
      name: "plan-k:theme",
      version: 2,
      migrate(persistedState, fromVersion) {
        const s = persistedState as Record<string, unknown> & {
          state?: Record<string, unknown>;
        };
        // v1 stored { theme: "dark" | "light" } — lift to { mode, resolvedTheme }
        if (fromVersion < 2) {
          const legacyTheme = (s as { theme?: string }).theme ?? "dark";
          const mode = (
            legacyTheme === "light" ? "light" : "dark"
          ) as ThemeMode;
          return {
            mode,
            resolvedTheme: mode as "dark" | "light",
            autoDarkStart: 18,
            autoDarkEnd: 7,
          };
        }
        return s;
      },
    },
  ),
);
