"use client";

import { GripVertical } from "lucide-react";
import { useBlockDragStart } from "@/hooks/builder/use-block-drag-start.hook";
import { cn } from "@/lib/utils";

type Props = { blockId: string; parentId?: string };

/**
 * Reusable drag handle for inline-editor Line components (ParagraphLine,
 * HeadingLine, QuoteLine, CodeLine, ListLine, ChecklistLine).
 *
 * Produces the same drag payload as BlockFrame's built-in handle and delegates
 * all drag-store logic to the shared `useBlockDragStart` hook.
 *
 * Usage requirements:
 *   - The parent element must carry the class `group/eb relative` so the
 *     `group-hover/eb:opacity-100` visibility transition fires correctly.
 *   - The parent must allow `overflow-visible` (or at least not `overflow-hidden`)
 *     so the `-left-5` negative offset is not clipped.
 *   - The nearest `[data-block-id]` ancestor is used as the drag image source.
 */
export function BlockDragHandle({ blockId, parentId }: Props) {
  const { onDragStart, onDragEnd } = useBlockDragStart(blockId, parentId);

  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      // Stop pointer events from bubbling into the InlineEditor so hovering the
      // handle does not inadvertently move the text cursor.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "pointer-events-auto absolute -left-5 top-1.5 flex h-5 w-5 cursor-grab items-center justify-center rounded text-muted-foreground/60",
        "opacity-0 transition-opacity duration-150 group-hover/eb:opacity-100 focus-visible:opacity-100",
        "hover:text-foreground active:cursor-grabbing focus-visible:text-foreground",
      )}
    >
      <GripVertical className="size-3.5" />
    </button>
  );
}
