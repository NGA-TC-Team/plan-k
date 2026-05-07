"use client";

import { useEffect } from "react";
import { useBuilderDispatch, useBuilderState } from "./use-builder-store.hook";

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (TYPING_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useBuilderShortcuts() {
  const dispatch = useBuilderDispatch();
  const editingKind = useBuilderState((s) => s.state.editing.kind);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const typing = isTypingTarget(e.target);

      // Escape always cancels edit (works inside text inputs too)
      if (e.key === "Escape" && editingKind === "node") {
        e.preventDefault();
        dispatch({ type: "CANCEL_EDIT" });
        return;
      }

      // ⌘Enter commits the current edit
      if (isMod && e.key === "Enter" && editingKind === "node") {
        e.preventDefault();
        dispatch({ type: "COMMIT_EDIT" });
        return;
      }

      // skip undo/redo & plain-Enter shortcuts while typing in inputs
      if (typing) return;

      if (isMod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: "REDO" });
        } else {
          dispatch({ type: "UNDO" });
        }
        return;
      }

      if (isMod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      // plain Enter commits when not typing (e.g. focus on the block shell)
      if (e.key === "Enter" && editingKind === "node") {
        e.preventDefault();
        dispatch({ type: "COMMIT_EDIT" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, editingKind]);
}
