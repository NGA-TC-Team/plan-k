"use client";

import { create } from "zustand";

type UiState = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // E1: global overlays
  helpSheetOpen: boolean;
  setHelpSheetOpen: (open: boolean) => void;
  toggleHelpSheet: () => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  helpSheetOpen: false,
  setHelpSheetOpen: (open) => set({ helpSheetOpen: open }),
  toggleHelpSheet: () => set((s) => ({ helpSheetOpen: !s.helpSheetOpen })),

  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
}));
