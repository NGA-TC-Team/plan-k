"use client";

import { useContext } from "react";
import { BuilderContext } from "@/components/builder/builder-context";
import { blocksToMarkdown } from "@/lib/section-to-markdown";
import { useBlockDragStore } from "@/services/stores";
import { useBuilderState } from "./use-builder-store.hook";

/**
 * Shared drag-start logic for Backlog/Docs inline-editor blocks.
 *
 * Used by both BlockFrame (canvas blocks) and BlockDragHandle (inline-editor
 * Line components that render their own outermost container).
 *
 * Returns `{ onDragStart, onDragEnd }` handlers to attach to the draggable
 * button element.
 *
 * Payload produced:
 *   application/x-block-id      → blockId
 *   application/x-block-context → "docs"
 *   text/plain + text/markdown  → Markdown serialization (if non-empty)
 *
 * `beginDrag` receives `fromAncestorPath: parentId ? [parentId] : []` which
 * guards against cyclic drops when a block is dropped onto its own section.
 */
export function useBlockDragStart(blockId: string, parentId?: string) {
  const beginDrag = useBlockDragStore((s) => s.begin);
  const endDrag = useBlockDragStore((s) => s.end);
  // Primitive selector — snapshot-safe without useShallow.
  const kind = useBuilderState((s) => s.state.blocks[blockId]?.kind ?? "");
  // getState() for use inside event handlers (not render); mirrors BlockShell pattern.
  const storeHook = useContext(BuilderContext);

  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("application/x-block-id", blockId);
    // Backlog blocks live in the "docs" context — InsertSlot expects this MIME
    // envelope to accept a drop from the Backlog sheet onto the Docs canvas.
    e.dataTransfer.setData("application/x-block-context", "docs");

    // Drag image: the block element itself (closest [data-block-id] ancestor).
    const host = (e.currentTarget as HTMLElement).closest(
      "[data-block-id]",
    ) as HTMLElement | null;
    if (host) e.dataTransfer.setDragImage(host, 8, 8);

    // Markdown payload for external drop targets (Notion, VS Code, etc.).
    // Read getState() once — safe in an event handler, not during render.
    if (storeHook) {
      const appState = storeHook.getState().state;
      // block may have been deleted in a concurrent action — skip gracefully.
      const markdown = blocksToMarkdown(appState, [blockId]);
      if (markdown.trim()) {
        e.dataTransfer.setData("text/plain", markdown);
        e.dataTransfer.setData("text/markdown", markdown);
      }
    }

    beginDrag({
      blockId,
      // Fallback to blockId when parentId is absent so beginDrag always has a
      // non-empty id. The cyclic-drop guard only triggers when the drop target
      // is in fromAncestorPath, so this is safe when parentId is unknown.
      parentId: parentId ?? blockId,
      context: "docs",
      kind,
      // fromAncestorPath: direct children of a section have one ancestor —
      // the section itself. Needed to prevent dropping a block onto its own parent.
      fromAncestorPath: parentId ? [parentId] : [],
    });
  };

  const onDragEnd = () => endDrag();

  return { onDragStart, onDragEnd };
}
