"use client";

import { useEffect } from "react";
import { useUiStore } from "@/services/stores";

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (TYPING_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

// App-wide shortcuts: `?` opens help sheet, ⌘/Ctrl+K toggles command palette.
// Mounted once at the layout level so it works outside builder context.
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        useUiStore.getState().togglePalette();
        return;
      }

      // `?` — Shift+/ on most layouts. Skip while typing so ? in inputs works.
      if (e.key === "?" && !isMod && !isTypingTarget(e.target)) {
        e.preventDefault();
        useUiStore.getState().toggleHelpSheet();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
