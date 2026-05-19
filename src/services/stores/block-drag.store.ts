"use client";

import { create } from "zustand";

type BlockDragState = {
  draggingId: string | null;
  fromParentId: string | null;
  context: string | null;
  /** kind of the block being dragged */
  kind: string | null;
  /** ancestor id chain of the dragging block (excludes self, nearest-first) */
  fromAncestorPath: string[];
  begin: (args: {
    blockId: string;
    parentId: string;
    context: string;
    kind: string;
    fromAncestorPath: string[];
  }) => void;
  end: () => void;
};

export const useBlockDragStore = create<BlockDragState>((set) => ({
  draggingId: null,
  fromParentId: null,
  context: null,
  kind: null,
  fromAncestorPath: [],
  begin: ({ blockId, parentId, context, kind, fromAncestorPath }) =>
    set({
      draggingId: blockId,
      fromParentId: parentId,
      context,
      kind,
      fromAncestorPath,
    }),
  end: () =>
    set({
      draggingId: null,
      fromParentId: null,
      context: null,
      kind: null,
      fromAncestorPath: [],
    }),
}));
