"use client";

import { create } from "zustand";

type State = {
  // ad-hoc chat session IDs currently visible in the drawer. They are
  // appended on action trigger and dropped when the drawer closes
  // explicitly via "Done" or after the run resolves and the user
  // applies/rejects every staged intent.
  sessionIds: string[];
  open: boolean;
  // Quick picker triggered by Cmd+. — opens an action chooser for the
  // currently-selected block without requiring a right-click. The
  // block snapshot is captured at trigger time so the picker doesn't
  // need a live builder-store subscription (it's mounted globally).
  pickerBlock: {
    planId: string;
    id: string;
    kind: string;
    parentId: string;
    data: unknown;
  } | null;
  addSession: (id: string) => void;
  removeSession: (id: string) => void;
  setOpen: (open: boolean) => void;
  openPicker: (block: NonNullable<State["pickerBlock"]>) => void;
  closePicker: () => void;
};

// Tracks open state and active inline-AI sessions for the
// InlineAiDrawer. Lives outside useChatStore so the chat panel's UI
// state isn't affected by canvas-driven runs.
export const useInlineAiStore = create<State>((set) => ({
  sessionIds: [],
  open: false,
  pickerBlock: null,
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
  openPicker: (block) => set({ pickerBlock: block }),
  closePicker: () => set({ pickerBlock: null }),
}));
