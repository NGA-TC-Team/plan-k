"use client";

import { create } from "zustand";

export type TopMode = "docs" | "app" | "backlog";
export type CanvasMode = "screen" | "flow";

export type BuilderUiState = {
  topMode: TopMode;
  canvasMode: CanvasMode;
  currentSectionId: string | null;
  leftRailCollapsed: boolean;
  zenMode: boolean;
  setTopMode: (mode: TopMode) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  setCurrentSectionId: (id: string | null) => void;
  setLeftRailCollapsed: (v: boolean) => void;
  toggleLeftRail: () => void;
  setZenMode: (v: boolean) => void;
  toggleZenMode: () => void;
};

export const useBuilderUiStore = create<BuilderUiState>((set) => ({
  topMode: "app",
  canvasMode: "screen",
  currentSectionId: null,
  leftRailCollapsed: false,
  zenMode: false,
  setTopMode: (topMode) => set({ topMode }),
  setCanvasMode: (canvasMode) => set({ canvasMode }),
  setCurrentSectionId: (currentSectionId) => set({ currentSectionId }),
  setLeftRailCollapsed: (leftRailCollapsed) => set({ leftRailCollapsed }),
  toggleLeftRail: () =>
    set((s) => ({ leftRailCollapsed: !s.leftRailCollapsed })),
  setZenMode: (zenMode) => set({ zenMode }),
  toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
}));
