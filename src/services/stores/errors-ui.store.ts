"use client";

import { create } from "zustand";

type ErrorsUiState = {
  open: boolean;
  selectedErrorId: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  selectError: (id: string | null) => void;
};

export const useErrorsUiStore = create<ErrorsUiState>()((set) => ({
  open: false,
  selectedErrorId: null,
  openDrawer: () => set({ open: true }),
  // closeDrawer also clears selectedErrorId to avoid stale selection on reopen
  closeDrawer: () => set({ open: false, selectedErrorId: null }),
  selectError: (id) => set({ selectedErrorId: id }),
}));
