"use client";

import { create } from "zustand";
import type { Intent } from "@/builder/types/intent";

const FLASH_DURATION_MS = 600;

type AiFlashState = {
  flashedIds: Set<string>;
  flash: (ids: string[] | string) => void;
  has: (id: string) => boolean;
};

export const useAiFlashStore = create<AiFlashState>((set, get) => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    flashedIds: new Set(),
    flash: (ids) => {
      const arr = typeof ids === "string" ? [ids] : ids;
      if (arr.length === 0) return;
      const next = new Set(get().flashedIds);
      for (const id of arr) {
        next.add(id);
        const existing = timers.get(id);
        if (existing) clearTimeout(existing);
        timers.set(
          id,
          setTimeout(() => {
            const cur = new Set(useAiFlashStore.getState().flashedIds);
            cur.delete(id);
            timers.delete(id);
            useAiFlashStore.setState({ flashedIds: cur });
          }, FLASH_DURATION_MS),
        );
      }
      set({ flashedIds: next });
    },
    has: (id) => get().flashedIds.has(id),
  };
});

export function affectedNodeIdsFor(intent: Intent): string[] {
  switch (intent.type) {
    case "INSERT_BLOCK":
      return [intent.block.id, intent.parentId];
    case "MOVE_BLOCK":
      return [intent.nodeId, intent.toParentId];
    case "UPDATE_BLOCK":
    case "DELETE_BLOCK":
      return [intent.nodeId];
    case "INSERT_SECTION":
      return [intent.section.id];
    case "UPDATE_SECTION":
    case "DELETE_SECTION":
      return [intent.sectionId];
    case "MOVE_SECTION":
      return intent.toParentId
        ? [intent.sectionId, intent.toParentId]
        : [intent.sectionId];
    case "INSERT_SCREEN":
      return [intent.screen.id];
    case "UPDATE_SCREEN":
    case "DELETE_SCREEN":
      return [intent.screenId];
    case "INSERT_SCREEN_EDGE":
      return [intent.edge.id, intent.edge.from, intent.edge.to];
    case "INSERT_AGENT_NODE":
      return [intent.node.id];
    case "DELETE_AGENT_NODE":
      return [intent.nodeId];
    default:
      return [];
  }
}

export function isAgentOrigin(origin: string): boolean {
  return origin.startsWith("claude:") || origin.startsWith("agent:");
}
