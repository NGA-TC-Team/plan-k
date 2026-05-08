"use client";

import { create } from "zustand";

const FLASH_MS = 1500;

type State = {
  ids: ReadonlySet<string>;
  flash: (ids: string[]) => void;
  clear: () => void;
};

const EMPTY: ReadonlySet<string> = new Set();

// Transient highlight set used after navigating to a search hit. The
// renderer reads `ids` and wraps matching nodes with a brief outline;
// the set self-clears after FLASH_MS so a stale highlight doesn't
// linger across user interactions.
export const useSearchHighlightStore = create<State>((set) => ({
  ids: EMPTY,
  flash: (ids) => {
    set({ ids: new Set(ids) });
    setTimeout(() => {
      set((current) => {
        // Don't stomp on a newer flash that already replaced ours.
        const same =
          current.ids.size === ids.length &&
          ids.every((id) => current.ids.has(id));
        return same ? { ids: EMPTY } : current;
      });
    }, FLASH_MS);
  },
  clear: () => set({ ids: EMPTY }),
}));
