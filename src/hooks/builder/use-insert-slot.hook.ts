"use client";

import { useCallback } from "react";
import { defaultDataFor } from "@/builder/defaults";
import type { BlockEntity, BlockKind } from "@/builder/types/entity";
import { useBuilderDispatch } from "./use-builder-store.hook";

export type InsertHandler = (kind: BlockKind, index?: number) => void;

export function useInsertSlot(parentId: string): InsertHandler {
  const dispatch = useBuilderDispatch();
  return useCallback(
    (kind, index) => {
      const block: BlockEntity = {
        id: crypto.randomUUID(),
        parentId,
        kind,
        data: defaultDataFor(kind),
      };
      dispatch({ type: "INSERT_BLOCK", parentId, block, index });
    },
    [dispatch, parentId],
  );
}
