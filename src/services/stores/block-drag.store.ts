"use client";

import { create } from "zustand";

type BlockDragState = {
  draggingId: string | null;
  fromParentId: string | null;
  context: string | null;
  begin: (args: { blockId: string; parentId: string; context: string }) => void;
  end: () => void;
};

export const useBlockDragStore = create<BlockDragState>((set) => ({
  draggingId: null,
  fromParentId: null,
  context: null,
  begin: ({ blockId, parentId, context }) =>
    set({ draggingId: blockId, fromParentId: parentId, context }),
  end: () => set({ draggingId: null, fromParentId: null, context: null }),
}));
