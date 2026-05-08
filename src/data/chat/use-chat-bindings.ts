"use client";

import { useEffect } from "react";
import { useBuilderStateShallow } from "@/hooks/builder/use-builder-store.hook";
import {
  type MentionKind,
  type MentionRef,
  useChatStore,
} from "@/services/stores";

// Wires builder ⇆ chat: keeps planId in sync and, when auto-tag is on,
// pushes the currently selected node into the composer's mention chips.

export function useChatBindings(planId: string) {
  const setPlanId = useChatStore((s) => s.setPlanId);

  useEffect(() => {
    setPlanId(planId);
    return () => setPlanId(null);
  }, [planId, setPlanId]);

  // Selection → mention chip. We pull the selection id and resolve a label
  // from the same builder state — selection only fires for blocks today,
  // but we leave room for screens / sections by passing through the store.
  const selection = useBuilderStateShallow((s) => {
    const sel = s.state.selection;
    if (sel.kind !== "node") return null;
    const blocks = s.state.blocks;
    const sections = s.state.sections;
    const screens = s.state.screens;
    const id = sel.id;
    if (blocks[id]) {
      return {
        kind: "block" as const,
        id,
        label:
          truncate(blockLabel(blocks[id]?.kind, blocks[id]?.data)) ||
          blocks[id].kind,
      };
    }
    if (sections[id]) {
      return {
        kind: "section" as const,
        id,
        label: truncate(sections[id].title) || "section",
      };
    }
    if (screens[id]) {
      return {
        kind: "screen" as const,
        id,
        label: truncate(screens[id].title) || "screen",
      };
    }
    return null;
  });

  useEffect(() => {
    if (!selection) return;
    const state = useChatStore.getState();
    if (state.tab !== "chat" || !state.autoTagOnSelect) return;
    state.addPendingMention(selection satisfies MentionRef);
  }, [selection]);
}

function truncate(s: string | undefined): string {
  if (!s) return "";
  return s.length > 32 ? `${s.slice(0, 30)}…` : s;
}

function blockLabel(kind: string | undefined, data: unknown): string {
  if (!data || typeof data !== "object") return kind ?? "";
  const d = data as Record<string, unknown>;
  if (typeof d.title === "string") return d.title;
  if (typeof d.text === "string") return d.text;
  if (typeof d.markdown === "string") return d.markdown;
  if (typeof d.label === "string") return d.label;
  if (typeof d.name === "string") return d.name;
  return kind ?? "";
}

// Re-export the type for ergonomics (so call sites can avoid the long path).
export type { MentionKind, MentionRef };
