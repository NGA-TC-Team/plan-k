"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BlockContext, BlockKind } from "@/builder/types/entity";

const MRU_LIMIT = 5;

type MruMap = Record<BlockContext, BlockKind[]>;

type State = {
  mru: MruMap;
  push: (context: BlockContext, kind: BlockKind) => void;
};

const initial: MruMap = { docs: [], app: [], agent: [] };

// Per-context "recently used" block kinds for the InsertSlot popover and the
// command palette. Top 5 only, persisted to localStorage so the UX survives
// a reload. Kept as a separate store so other features (templates, AI
// suggestions) can read without coupling to the popover internals.
export const useInsertMruStore = create<State>()(
  persist(
    (set) => ({
      mru: initial,
      push: (context, kind) =>
        set((s) => {
          const existing = s.mru[context] ?? [];
          const next = [kind, ...existing.filter((k) => k !== kind)].slice(
            0,
            MRU_LIMIT,
          );
          return { mru: { ...s.mru, [context]: next } };
        }),
    }),
    {
      name: "plan-k:insert-mru",
      version: 1,
    },
  ),
);
