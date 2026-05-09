"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PrintOptions = {
  cover: boolean;
  toc: boolean;
  pageNumbers: boolean;
  footerText: string;
};

type PrintOptionsState = PrintOptions & {
  setCover: (v: boolean) => void;
  setToc: (v: boolean) => void;
  setPageNumbers: (v: boolean) => void;
  setFooterText: (v: string) => void;
};

export const usePrintOptionsStore = create<PrintOptionsState>()(
  persist(
    (set) => ({
      cover: true,
      toc: true,
      pageNumbers: true,
      footerText: "",

      setCover: (v) => set({ cover: v }),
      setToc: (v) => set({ toc: v }),
      setPageNumbers: (v) => set({ pageNumbers: v }),
      setFooterText: (v) => set({ footerText: v }),
    }),
    {
      name: "plan-k:print-options",
      version: 1,
      // No-op migrate slot: future v1→v2 logic goes here.
      migrate(persistedState) {
        return persistedState as PrintOptionsState;
      },
    },
  ),
);
