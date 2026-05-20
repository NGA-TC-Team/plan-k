"use client";

import { create } from "zustand";

export type TopMode = "docs" | "app" | "backlog";
export type CanvasMode = "screen" | "flow";

export type BuilderUiState = {
  topMode: TopMode;
  canvasMode: CanvasMode;
  currentSectionId: string | null;
  leftRailCollapsed: boolean;
  setTopMode: (mode: TopMode) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  setCurrentSectionId: (id: string | null) => void;
  setLeftRailCollapsed: (v: boolean) => void;
  toggleLeftRail: () => void;
};

export const useBuilderUiStore = create<BuilderUiState>((set) => ({
  topMode: "app",
  canvasMode: "screen",
  currentSectionId: null,
  leftRailCollapsed: false,
  setTopMode: (topMode) => set({ topMode }),
  setCanvasMode: (canvasMode) => set({ canvasMode }),
  setCurrentSectionId: (currentSectionId) => set({ currentSectionId }),
  setLeftRailCollapsed: (leftRailCollapsed) => set({ leftRailCollapsed }),
  toggleLeftRail: () =>
    set((s) => ({ leftRailCollapsed: !s.leftRailCollapsed })),
}));
