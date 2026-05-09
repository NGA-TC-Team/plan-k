"use client";

import { create } from "zustand";

type VersionsUiState = {
  open: boolean;
  selectedVersionId: string | null;
  tagDialogOpen: boolean;
  /** When non-null, drawer shows DiffPanel for this version id */
  diffVersionId: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  selectVersion: (id: string | null) => void;
  openTagDialog: () => void;
  closeTagDialog: () => void;
  openDiff: (versionId: string) => void;
  closeDiff: () => void;
};

export const useVersionsUiStore = create<VersionsUiState>()((set) => ({
  open: false,
  selectedVersionId: null,
  tagDialogOpen: false,
  diffVersionId: null,
  openDrawer: () => set({ open: true }),
  // closeDrawer clears diffVersionId to prevent stale state on reopen
  closeDrawer: () => set({ open: false, diffVersionId: null }),
  selectVersion: (id) => set({ selectedVersionId: id }),
  openTagDialog: () => set({ tagDialogOpen: true }),
  closeTagDialog: () => set({ tagDialogOpen: false }),
  // openDiff keeps the drawer open and switches to the diff sub-view
  openDiff: (versionId) => set({ diffVersionId: versionId }),
  closeDiff: () => set({ diffVersionId: null }),
}));
