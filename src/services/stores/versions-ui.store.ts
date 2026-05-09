"use client";

import { create } from "zustand";

type VersionsUiState = {
  open: boolean;
  selectedVersionId: string | null;
  tagDialogOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  selectVersion: (id: string | null) => void;
  openTagDialog: () => void;
  closeTagDialog: () => void;
};

export const useVersionsUiStore = create<VersionsUiState>()((set) => ({
  open: false,
  selectedVersionId: null,
  tagDialogOpen: false,
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
  selectVersion: (id) => set({ selectedVersionId: id }),
  openTagDialog: () => set({ tagDialogOpen: true }),
  closeTagDialog: () => set({ tagDialogOpen: false }),
}));
