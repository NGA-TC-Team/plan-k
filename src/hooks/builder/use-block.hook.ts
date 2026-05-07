"use client";

import { useMemo } from "react";
import type { BlockViewModel } from "@/builder/projection";
import { projectBlock } from "@/builder/projection";
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
  const viewMode = useBuilderState((s) => s.state.viewMode);
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
