"use client";

import { GripVertical } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useParams } from "next/navigation";
import { useContext } from "react";
import { resolveClickSelection } from "@/builder/selection-click";
import {
  resolveSpacingClass,
  spacingDefaultsFor,
  spacingFromBlockData,
} from "@/builder/spacing";
import { BuilderContext } from "@/components/builder/builder-context";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useBlock, useBlockChildren } from "@/hooks/builder/use-block.hook";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useAiFlashStore, useBlockDragStore } from "@/services/stores";
import { InlineAiMenu } from "./inline-ai/menu";
import { InsertSlot } from "./insert-slot";
import { pickRenderer } from "./renderers";

export function BlockShell({ blockId }: { blockId: string }) {
  const { vm, handlers, viewMode } = useBlock(blockId);
  const reduceMotion = useReducedMotion();
  const beginDrag = useBlockDragStore((s) => s.begin);
  const endDrag = useBlockDragStore((s) => s.end);
  const isDragging = useBlockDragStore((s) => s.draggingId === blockId);
  const isFlashing = useAiFlashStore((s) => s.flashedIds.has(blockId));
  const dispatch = useBuilderDispatch();
  const storeHook = useContext(BuilderContext);
  const params = useParams();
  const planId = typeof params.id === "string" ? params.id : null;
  if (!vm) return null;

  const Renderer = pickRenderer(viewMode, vm.context, vm.kind);
  const spacingClass =
    vm.context === "app" || vm.context === "docs"
      ? resolveSpacingClass(
          spacingFromBlockData(vm.displayValue),
          spacingDefaultsFor(vm.kind),
        )
      : "";
  const draggable = vm.context === "app" || vm.context === "docs";

  return (
    <motion.div
      layout={reduceMotion ? false : "position"}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={
        reduceMotion
          ? { opacity: 1, y: 0 }
          : isFlashing
            ? {
                backgroundColor: [
                  "rgba(94, 105, 209, 0)",
                  "rgba(94, 105, 209, 0.12)",
                  "rgba(94, 105, 209, 0)",
                ],
                y: 0,
              }
            : { opacity: 1, y: 0 }
      }
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{
        duration: reduceMotion ? 0 : isFlashing ? 0.3 : 0.18,
        ease: "easeOut",
      }}
      data-block-id={vm.id}
      className={cn(
        "group/block relative rounded-md outline-none first-of-type:mt-0",
        "min-w-0",
        spacingClass,
        vm.isSelected && "ring-1 ring-ring/70",
        vm.isPending && "opacity-70",
        isDragging && "opacity-40",
      )}
      onPointerDown={(e) => {
        e.stopPropagation();
        const modifier = e.shiftKey
          ? "shift"
          : e.metaKey || e.ctrlKey
            ? "toggle"
            : "none";
        if (modifier === "none" || !storeHook) {
          handlers.onSelect();
          return;
        }
        const intent = resolveClickSelection(
          storeHook.getState().state,
          blockId,
          modifier,
        );
        dispatch(intent);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handlers.onBeginEdit();
      }}
    >
      {draggable ? (
        <button
          type="button"
          aria-label="Drag to reorder"
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("application/x-block-id", vm.id);
            e.dataTransfer.setData("application/x-block-context", vm.context);
            // Use the block element as the drag image so users see what moves.
            const host = (e.currentTarget as HTMLElement).closest(
              "[data-block-id]",
            ) as HTMLElement | null;
            if (host) {
              e.dataTransfer.setDragImage(host, 8, 8);
            }
            // Compute the ancestor id chain (nearest-first, excluding self).
            // Reading state once outside of render via getState() — same pattern
            // as resolveClickSelection above.
            const fromAncestorPath: string[] = [];
            if (storeHook) {
              const blocks = storeHook.getState().state.blocks;
              let cur = vm.parentId as string | null | undefined;
              while (cur != null && cur in blocks) {
                fromAncestorPath.push(cur);
                cur = blocks[cur]?.parentId;
              }
              // If the immediate parent itself (a screen/section) is not in
              // blocks, we still want it in the path for the drop-guard.
              if (fromAncestorPath.length === 0 && vm.parentId !== vm.id) {
                fromAncestorPath.push(vm.parentId);
              }
            }
            beginDrag({
              blockId: vm.id,
              parentId: vm.parentId,
              context: vm.context,
              kind: vm.kind,
              fromAncestorPath,
            });
          }}
          onDragEnd={() => endDrag()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute -left-6 top-1/2 -translate-y-1/2 flex h-6 w-5 cursor-grab items-center justify-center rounded text-muted-foreground/60",
            "hover:text-foreground active:cursor-grabbing focus-visible:text-foreground",
          )}
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      <ContextMenu>
        <ContextMenuTrigger className="contents">
          <Renderer vm={vm} handlers={handlers} />
          {/* layout blocks manage their own children + InsertSlots internally */}
          {vm.kind !== "layout" ? <BlockChildren parentId={vm.id} /> : null}
        </ContextMenuTrigger>
        {planId ? (
          <ContextMenuContent>
            <InlineAiMenu planId={planId} block={vm} />
          </ContextMenuContent>
        ) : null}
      </ContextMenu>
    </motion.div>
  );
}

function BlockChildren({ parentId }: { parentId: string }) {
  const childIds = useBlockChildren(parentId);
  if (childIds.length === 0) return null;
  return (
    <div className="mt-2 ml-4">
      <AnimatePresence initial={false}>
        {childIds.map((id, idx) => (
          <div key={id}>
            <InsertSlot parentId={parentId} index={idx} />
            <BlockShell blockId={id} />
          </div>
        ))}
      </AnimatePresence>
      <InsertSlot
        parentId={parentId}
        index={childIds.length}
        variant="trailing"
      />
    </div>
  );
}
