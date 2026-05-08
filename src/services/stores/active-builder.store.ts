"use client";

import { create } from "zustand";
import type { createBuilderStore } from "@/builder/store";

type BuilderStoreHook = ReturnType<typeof createBuilderStore>;

type State = {
  store: BuilderStoreHook | null;
  setStore: (store: BuilderStoreHook | null) => void;
};

// Mirror of BuilderContext for code that lives outside the provider
// tree (global overlays, keyboard shortcut handlers in
// useGlobalShortcuts). BuilderProvider writes on mount and clears on
// unmount; consumers should treat the value as best-effort and bail
// when null.
export const useActiveBuilderStore = create<State>((set) => ({
  store: null,
  setStore: (store) => set({ store }),
}));
