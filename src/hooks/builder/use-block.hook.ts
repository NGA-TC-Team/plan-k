"use client";

import { useMemo } from "react";
import type { BlockViewModel } from "@/builder/projection";
import { projectBlock } from "@/builder/projection";
import { getEffectiveViewMode } from "@/builder/selectors/view-mode";
import type { BlockHandlers } from "@/components/builder/renderers/types";
import {
  useBuilderDispatch,
  useBuilderState,
  useBuilderStateShallow,
} from "./use-builder-store.hook";

export type UseBlockReturn = {
  vm: BlockViewModel | null;
  handlers: BlockHandlers;
  viewMode: "detail" | "wireframe";
};

export function useBlock(blockId: string): UseBlockReturn {
  const vm = useBuilderStateShallow((s) => projectBlock(s.state, blockId));
  // Resolve effective viewMode: parentId may be a section or screen; its
  // entityMeta.viewModeOverride takes priority over the global viewMode.
  const viewMode = useBuilderState((s) =>
    getEffectiveViewMode(s.state, vm?.parentId ?? null),
  );
  const dispatch = useBuilderDispatch();

  const handlers = useMemo<BlockHandlers>(
    () => ({
      onSelect: () => dispatch({ type: "SELECT_NODE", nodeId: blockId }),
      onBeginEdit: () => dispatch({ type: "BEGIN_EDIT", nodeId: blockId }),
      onCancelEdit: () => dispatch({ type: "CANCEL_EDIT" }),
      onCommitEdit: () => dispatch({ type: "COMMIT_EDIT" }),
      onDelete: () => dispatch({ type: "DELETE_BLOCK", nodeId: blockId }),
    }),
    [dispatch, blockId],
  );

  return { vm, handlers, viewMode };
}

const EMPTY_IDS: readonly string[] = Object.freeze([]);
export function useBlockChildren(parentId: string): readonly string[] {
  return useBuilderState((s) => s.state.children[parentId] ?? EMPTY_IDS);
}
