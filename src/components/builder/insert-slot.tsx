"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { inferContextForParent } from "@/builder/decider/structure";
import type { BlockKind } from "@/builder/types/entity";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { useInsertSlot } from "@/hooks/builder/use-insert-slot.hook";
import { cn } from "@/lib/utils";
import { useBlockDragStore } from "@/services/stores";
import { BlockKindPicker } from "./block-kind-picker";

type Props = {
  parentId: string;
  index?: number;
  variant?: "between" | "trailing";
  orientation?: "horizontal" | "vertical";
};

export function InsertSlot({
  parentId,
  index,
  variant = "between",
  orientation = "vertical",
}: Props) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const insert = useInsertSlot(parentId);
  const dispatch = useBuilderDispatch();

  const draggingId = useBlockDragStore((s) => s.draggingId);
  const dragContext = useBlockDragStore((s) => s.context);
  const fromAncestorPath = useBlockDragStore((s) => s.fromAncestorPath);
  const endDrag = useBlockDragStore((s) => s.end);

  const context = useBuilderState((s) =>
    inferContextForParent(s.state, parentId),
  );

  // Guard: don't activate the drop zone if the drop would be cyclic.
  // - draggingId !== parentId: don't drop immediately above/below self
  //   (already existing check, meaningful for same-parent moves).
  // - !fromAncestorPath.includes(parentId): don't allow dropping into a
  //   descendant container of the dragging block.
  const dragActive =
    draggingId !== null &&
    dragContext === context &&
    draggingId !== parentId &&
    !fromAncestorPath.includes(parentId);

  const planKind = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.kind ?? null,
  );
  const platform: "mobile" | "web" = planKind === "mobile" ? "mobile" : "web";

  const handlePick = (kind: BlockKind) => {
    // MRU push is handled inside BlockKindPicker before calling onPick.
    insert(kind, index);
    setOpen(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const blockId = e.dataTransfer.getData("application/x-block-id");
    if (!blockId) {
      endDrag();
      return;
    }
    const targetIndex = index ?? 0;
    // Same-parent drops: indices in the reducer are computed against the
    // sibling list with the dragged node already filtered out, so dropping
    // at the slot position is correct as-is.
    dispatch({
      type: "MOVE_BLOCK",
      nodeId: blockId,
      toParentId: parentId,
      index: targetIndex,
    });
    endDrag();
  };

  const isHorizontal = orientation === "horizontal";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop target is purely visual; pointer/keyboard insertion uses the popover trigger.
    <div
      className={cn(
        "group/slot relative flex items-center justify-center transition-[width,height,background-color]",
        isHorizontal
          ? [
              "flex-row",
              variant === "between"
                ? dragActive
                  ? "w-5 h-full"
                  : "w-1 h-full"
                : "w-10 h-full",
              dragOver && "w-10 h-full",
            ]
          : [
              "flex-col",
              variant === "between" ? (dragActive ? "h-5" : "h-1") : "h-10",
              dragOver && "h-10",
            ],
      )}
      onDragOver={
        dragActive
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              if (!dragOver) setDragOver(true);
            }
          : undefined
      }
      onDragLeave={dragActive ? () => setDragOver(false) : undefined}
      onDrop={dragActive ? handleDrop : undefined}
    >
      {dragOver ? (
        isHorizontal ? (
          // Vertical bar indicator for horizontal slots
          <div className="pointer-events-none absolute inset-y-2 left-1/2 w-1 -translate-x-1/2 rounded-full bg-primary" />
        ) : (
          // Horizontal bar indicator for vertical slots
          <div className="pointer-events-none absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary" />
        )
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground transition-opacity",
            "hover:bg-accent hover:text-accent-foreground",
            variant === "between" &&
              "opacity-0 group-hover/slot:opacity-100 data-[popup-open]:opacity-100",
          )}
          aria-label="Insert block"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Plus className="h-3.5 w-3.5" />
        </PopoverTrigger>
        <PopoverContent
          className="w-72 max-h-[60vh] overflow-y-auto p-1 outline-none"
          sideOffset={6}
          tabIndex={-1}
        >
          <BlockKindPicker
            context={context}
            platform={platform}
            onPick={handlePick}
            autoFocus={open}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
