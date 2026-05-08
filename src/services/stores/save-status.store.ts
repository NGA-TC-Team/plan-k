"use client";

import { create } from "zustand";

// Tracks the in-flight intent persist mutations so the TopBar can show a
// trustworthy "Saved · 3s ago / Saving… / Offline (queued: N)" chip.
//
// We do not piggyback on a single React Query mutation because dispatch
// fires `mutate()` per intent — bursts overwrite the previous mutation
// state and the chip would flicker. A counter store fixes that.

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type SaveStatusState = {
  pending: number;
  lastSavedAt: number | null;
  lastError: string | null;
  status: SaveStatus;
  begin: () => void;
  succeed: () => void;
  fail: (reason: string) => void;
  reset: () => void;
};

export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  pending: 0,
  lastSavedAt: null,
  lastError: null,
  status: "idle",
  begin: () =>
    set((s) => ({
      pending: s.pending + 1,
      status: "saving",
      lastError: null,
    })),
  succeed: () =>
    set((s) => {
      const pending = Math.max(0, s.pending - 1);
      return {
        pending,
        lastSavedAt: Date.now(),
        status: pending === 0 ? "saved" : "saving",
      };
    }),
  fail: (reason) =>
    set((s) => {
      const pending = Math.max(0, s.pending - 1);
      return {
        pending,
        status: "error",
        lastError: reason,
      };
    }),
  reset: () =>
    set({ pending: 0, lastSavedAt: null, lastError: null, status: "idle" }),
}));
