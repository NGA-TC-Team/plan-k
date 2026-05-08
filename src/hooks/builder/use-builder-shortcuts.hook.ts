"use client";

import { useContext, useEffect } from "react";
import {
  getClipboard,
  intentsForPaste,
  serializeBlocks,
  setClipboard,
} from "@/builder/clipboard";
import { selectSelectedIds } from "@/builder/selectors";
import { BuilderContext } from "@/components/builder/builder-context";
import { useBuilderUiStore } from "@/services/stores";
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
  const storeHook = useContext(BuilderContext);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Multi-select aware actions need live state — handle them here so
      // we can fire batched intents instead of a single decision.
      if (storeHook && !isTypingTarget(e.target)) {
        const isMod = e.metaKey || e.ctrlKey;
        if (isMod && (e.key === "c" || e.key === "C")) {
          const ok = handleCopy(storeHook);
          if (ok) {
            e.preventDefault();
            return;
          }
        }
        if (isMod && (e.key === "v" || e.key === "V")) {
          const ok = handlePaste(storeHook, dispatch);
          if (ok) {
            e.preventDefault();
            return;
          }
        }
        if (isMod && (e.key === "a" || e.key === "A")) {
          const ok = handleSelectAll(storeHook, dispatch);
          if (ok) {
            e.preventDefault();
            return;
          }
        }
        if (isMod && (e.key === "d" || e.key === "D")) {
          const ok = handleDuplicate(storeHook, dispatch);
          if (ok) {
            e.preventDefault();
            return;
          }
        }
        if (
          (e.key === "Backspace" || e.key === "Delete") &&
          selection.kind === "multi"
        ) {
          e.preventDefault();
          dispatch({
            type: "BATCH",
            intents: selection.ids.map((id) => ({
              type: "DELETE_BLOCK" as const,
              nodeId: id,
            })),
          });
          return;
        }
      }

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
  }, [dispatch, editing, selection, storeHook]);
}

type StoreHook = NonNullable<React.ContextType<typeof BuilderContext>>;

function handleCopy(storeHook: StoreHook): boolean {
  const state = storeHook.getState().state;
  const ids = selectSelectedIds(state);
  if (ids.length === 0) return false;
  const planId = Object.values(state.plans)[0]?.id ?? "unknown";
  const payload = serializeBlocks(state, ids, `paste:${planId}`);
  if (!payload) return false;
  setClipboard(payload);
  return true;
}

function handlePaste(
  storeHook: StoreHook,
  dispatch: ReturnType<typeof useBuilderDispatch>,
): boolean {
  const payload = getClipboard();
  if (!payload) return false;
  const state = storeHook.getState().state;

  // Target = first selected block's parent + index after it. Fall back to
  // the active container when there is no selection.
  const ids = selectSelectedIds(state);
  let parentId: string | null = null;
  let index: number | undefined;
  if (ids.length > 0) {
    const anchor = ids[ids.length - 1];
    const block = state.blocks[anchor];
    if (block) {
      parentId = block.parentId;
      const siblings = state.children[block.parentId] ?? [];
      index = siblings.indexOf(anchor) + 1;
    }
  }
  if (!parentId) {
    // No selection — drop into the current screen / section.
    parentId = state.currentScreenId;
  }
  if (!parentId) return false;

  const intents = intentsForPaste(payload, parentId, index ?? 0, () =>
    crypto.randomUUID(),
  );
  if (intents.length === 0) return false;

  // Select all the freshly-pasted root ids so the user can immediately
  // continue with delete/duplicate/move on the new blocks.
  const newRootIds = intents
    .filter((i) => i.type === "INSERT_BLOCK" && i.parentId === parentId)
    .map((i) => (i.type === "INSERT_BLOCK" ? i.block.id : ""))
    .filter(Boolean);

  dispatch({
    type: "BATCH",
    intents: [...intents, { type: "SELECT_NODES", ids: newRootIds }],
  });
  return true;
}

function handleSelectAll(
  storeHook: StoreHook,
  dispatch: ReturnType<typeof useBuilderDispatch>,
): boolean {
  // Active container = current screen (app mode) or current section
  // (docs / agent scenario). Select all direct children there.
  const state = storeHook.getState().state;
  const ui = useBuilderUiStore.getState();
  const planKind = Object.values(state.plans)[0]?.kind ?? null;
  let parentId: string | null;
  if (ui.topMode === "docs") parentId = ui.currentSectionId;
  else if (ui.topMode === "app") parentId = state.currentScreenId;
  else if (planKind === "agent") parentId = ui.currentSectionId;
  else parentId = null;
  if (!parentId) return false;
  const ids = state.children[parentId] ?? [];
  if (ids.length === 0) return false;
  dispatch({ type: "SELECT_NODES", ids: [...ids] });
  return true;
}

function handleDuplicate(
  storeHook: StoreHook,
  dispatch: ReturnType<typeof useBuilderDispatch>,
): boolean {
  // Cmd+D == copy + paste in one step, leaving the clipboard untouched.
  const state = storeHook.getState().state;
  const ids = selectSelectedIds(state);
  if (ids.length === 0) return false;
  const planId = Object.values(state.plans)[0]?.id ?? "unknown";
  const payload = serializeBlocks(state, ids, `dup:${planId}`);
  if (!payload) return false;

  // Same paste target rule as handlePaste, but anchored to the original
  // selection so the duplicate appears next to the source.
  const anchor = ids[ids.length - 1];
  const block = state.blocks[anchor];
  if (!block) return false;
  const siblings = state.children[block.parentId] ?? [];
  const index = siblings.indexOf(anchor) + 1;

  const intents = intentsForPaste(payload, block.parentId, index, () =>
    crypto.randomUUID(),
  );
  if (intents.length === 0) return false;
  const newRootIds = intents
    .filter((i) => i.type === "INSERT_BLOCK" && i.parentId === block.parentId)
    .map((i) => (i.type === "INSERT_BLOCK" ? i.block.id : ""))
    .filter(Boolean);
  dispatch({
    type: "BATCH",
    intents: [...intents, { type: "SELECT_NODES", ids: newRootIds }],
  });
  return true;
}
