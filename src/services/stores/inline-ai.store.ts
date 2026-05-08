"use client";

import { create } from "zustand";

type State = {
  // ad-hoc chat session IDs currently visible in the drawer. They are
  // appended on action trigger and dropped when the drawer closes
  // explicitly via "Done" or after the run resolves and the user
  // applies/rejects every staged intent.
  sessionIds: string[];
  open: boolean;
  addSession: (id: string) => void;
  removeSession: (id: string) => void;
  setOpen: (open: boolean) => void;
};

// Tracks open state and active inline-AI sessions for the
// InlineAiDrawer. Lives outside useChatStore so the chat panel's UI
// state isn't affected by canvas-driven runs.
export const useInlineAiStore = create<State>((set) => ({
  sessionIds: [],
  open: false,
  addSession: (id) =>
    set((s) =>
      s.sessionIds.includes(id) ? s : { sessionIds: [...s.sessionIds, id] },
    ),
  removeSession: (id) =>
    set((s) => ({
      sessionIds: s.sessionIds.filter((x) => x !== id),
      open: s.sessionIds.length > 1 ? s.open : false,
    })),
  setOpen: (open) => set({ open }),
}));
