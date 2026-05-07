"use client";

import { useEffect } from "react";
import { decideShortcut } from "./decide-shortcut";
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
  const editing = useBuilderState((s) => s.state.editing);
  const selection = useBuilderState((s) => s.state.selection);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const intent = decideShortcut(
        {
          key: e.key,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          isTyping: isTypingTarget(e.target),
        },
        { editing, selection },
      );
      if (!intent) return;
      e.preventDefault();
      dispatch(intent);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, editing, selection]);
}
