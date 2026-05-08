"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  useActiveBuilderStore,
  useInlineAiStore,
  useUiStore,
} from "@/services/stores";

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (TYPING_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

// App-wide shortcuts: `?` opens help sheet, ⌘/Ctrl+K toggles command
// palette, ⌘/Ctrl+. opens the inline AI quick picker for the
// currently-selected block. Mounted once at the layout level so it
// works outside builder context (the builder lookups gracefully no-op
// when no plan is mounted).
export function useGlobalShortcuts() {
  const params = useParams();
  const planIdRef = useRef<string | null>(null);
  planIdRef.current = typeof params.id === "string" ? params.id : null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        useUiStore.getState().togglePalette();
        return;
      }

      if (isMod && e.key === ".") {
        e.preventDefault();
        triggerInlineAiPicker(planIdRef.current);
        return;
      }

      // `?` — Shift+/ on most layouts. Skip while typing so ? in inputs work.
      if (e.key === "?" && !isMod && !isTypingTarget(e.target)) {
        e.preventDefault();
        useUiStore.getState().toggleHelpSheet();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function triggerInlineAiPicker(planId: string | null) {
  const store = useActiveBuilderStore.getState().store;
  if (!store || !planId) return;
  const state = store.getState().state;
  if (state.selection.kind !== "node") return;
  const block = state.blocks[state.selection.id];
  if (!block) return;
  useInlineAiStore.getState().openPicker({
    planId,
    id: block.id,
    kind: block.kind,
    parentId: block.parentId as string,
    data: block.data,
  });
}
