"use client";

import { useEffect } from "react";
import { create } from "zustand";

const STORAGE_KEY = "plan-k:builder:panel-width";
const MIN = 320;
const MAX = 720;
const DEFAULT = 380;

function clamp(value: number): number {
  if (Number.isNaN(value)) return DEFAULT;
  return Math.min(MAX, Math.max(MIN, Math.round(value)));
}

type PanelState = {
  width: number;
  setWidth: (w: number) => void;
};

export const usePanelStore = create<PanelState>((set) => ({
  width: DEFAULT,
  setWidth: (w) => set({ width: clamp(w) }),
}));

export const PANEL_WIDTH_BOUNDS = { min: MIN, max: MAX, default: DEFAULT };

/**
 * Hydrate the persisted width once on mount and persist subsequent changes.
 * Mounted near the panel root so SSR hydration mismatches are avoided —
 * the store ships with `DEFAULT` until the client-side effect runs.
 */
export function usePanelWidthPersistence() {
  const setWidth = usePanelStore((s) => s.setWidth);
  const width = usePanelStore((s) => s.width);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isNaN(parsed)) setWidth(parsed);
    }
  }, [setWidth]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);
}
