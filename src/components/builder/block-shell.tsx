"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useBlock, useBlockChildren } from "@/hooks/builder/use-block.hook";
import { cn } from "@/lib/utils";
import { InsertSlot } from "./insert-slot";
import { pickRenderer } from "./renderers";

export function BlockShell({ blockId }: { blockId: string }) {
  const { vm, handlers, viewMode } = useBlock(blockId);
  const reduceMotion = useReducedMotion();
  if (!vm) return null;

  const Renderer = pickRenderer(viewMode, vm.kind);

  return (
    <motion.div
      layout={reduceMotion ? false : "position"}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
      data-block-id={vm.id}
      className={cn(
        "rounded-md outline-none",
        vm.isSelected && "ring-2 ring-blue-500 ring-offset-2",
        vm.isPending && "opacity-70",
      )}
      onPointerDown={(e) => {
        e.stopPropagation();
        handlers.onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handlers.onBeginEdit();
      }}
    >
      <Renderer vm={vm} handlers={handlers} />
      <BlockChildren parentId={vm.id} />
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
