"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SectionStatus } from "@/builder/types/entity";

// Backlog cards live in AppState as `SectionEntity` rows with
// `kind === "backlog"`. The intent log persists their title, status, and the
// block tree under each card. This store only persists the per-plan column
// ordering (status → ordered sectionId[]) plus transient UI state.

type BacklogState = {
  order: Record<string, Record<SectionStatus, string[]>>;
  openSheetId: string | null;
  draggingId: string | null;

  setOpenSheet: (id: string | null) => void;
  beginDrag: (id: string) => void;
  endDrag: () => void;

  registerNew: (
    planId: string,
    sectionId: string,
    status: SectionStatus,
  ) => void;
  unregister: (planId: string, sectionId: string) => void;
  reorder: (
    planId: string,
    sectionId: string,
    fromStatus: SectionStatus,
    toStatus: SectionStatus,
    toIndex: number,
  ) => void;
  orderedFor: (
    planId: string,
    statusOf: (sectionId: string) => SectionStatus,
    sectionIds: string[],
  ) => Record<SectionStatus, string[]>;
};

const emptyOrder = (): Record<SectionStatus, string[]> => ({
  pending: [],
  "in-progress": [],
  approved: [],
  rejected: [],
});

export const useBacklogStore = create<BacklogState>()(
  persist(
    (set, get) => ({
      order: {},
      openSheetId: null,
      draggingId: null,

      setOpenSheet: (openSheetId) => set({ openSheetId }),
      beginDrag: (id) => set({ draggingId: id }),
      endDrag: () => set({ draggingId: null }),

      registerNew: (planId, sectionId, status) => {
        const planOrder = get().order[planId] ?? emptyOrder();
        if (planOrder[status].includes(sectionId)) return;
        set((s) => ({
          order: {
            ...s.order,
            [planId]: {
              ...planOrder,
              [status]: [sectionId, ...planOrder[status]],
            },
          },
        }));
      },

      unregister: (planId, sectionId) => {
        const planOrder = get().order[planId];
        if (!planOrder) return;
        const next: Record<SectionStatus, string[]> = {
          pending: planOrder.pending.filter((x) => x !== sectionId),
          "in-progress": planOrder["in-progress"].filter(
            (x) => x !== sectionId,
          ),
          approved: planOrder.approved.filter((x) => x !== sectionId),
          rejected: planOrder.rejected.filter((x) => x !== sectionId),
        };
        set((s) => ({ order: { ...s.order, [planId]: next } }));
      },

      reorder: (planId, sectionId, fromStatus, toStatus, toIndex) => {
        const planOrder = get().order[planId] ?? emptyOrder();
        const fromList = planOrder[fromStatus].filter((x) => x !== sectionId);
        let toList: string[];
        if (fromStatus === toStatus) {
          const arr = fromList.slice();
          const clamped = Math.max(0, Math.min(toIndex, arr.length));
          arr.splice(clamped, 0, sectionId);
          toList = arr;
        } else {
          const arr = (planOrder[toStatus] ?? []).filter(
            (x) => x !== sectionId,
          );
          const clamped = Math.max(0, Math.min(toIndex, arr.length));
          arr.splice(clamped, 0, sectionId);
          toList = arr;
        }
        const nextOrder: Record<SectionStatus, string[]> =
          fromStatus === toStatus
            ? { ...planOrder, [toStatus]: toList }
            : { ...planOrder, [fromStatus]: fromList, [toStatus]: toList };
        set((s) => ({ order: { ...s.order, [planId]: nextOrder } }));
      },

      orderedFor: (planId, statusOf, sectionIds) => {
        const planOrder = get().order[planId] ?? emptyOrder();
        const out: Record<SectionStatus, string[]> = {
          pending: [],
          "in-progress": [],
          approved: [],
          rejected: [],
        };
        const seen = new Set<string>();
        const sectionSet = new Set(sectionIds);
        // 1) preserve persisted order for ids still alive
        for (const status of [
          "pending",
          "in-progress",
          "approved",
          "rejected",
        ] as const) {
          for (const id of planOrder[status] ?? []) {
            if (!sectionSet.has(id)) continue;
            const cur = statusOf(id);
            if (cur !== status) continue;
            out[cur].push(id);
            seen.add(id);
          }
        }
        // 2) append newly discovered sections to the head of their status column
        for (const id of sectionIds) {
          if (seen.has(id)) continue;
          out[statusOf(id)].unshift(id);
        }
        return out;
      },
    }),
    {
      name: "plan-k:backlog:v2",
      partialize: (s) => ({ order: s.order }),
    },
  ),
);

export type { BacklogState };
