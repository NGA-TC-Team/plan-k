"use client";

import { AnimatePresence } from "motion/react";
import { useBlockChildren } from "@/hooks/builder/use-block.hook";
import { cn } from "@/lib/utils";
import { BlockShell } from "../../block-shell";
import { InsertSlot } from "../../insert-slot";
import type { BlockRenderer } from "../types";

type LayoutMode = "vstack" | "hstack" | "grid";
type LayoutGap = "sm" | "md" | "lg";

const GAP_CLASS: Record<LayoutGap, string> = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

// Clamp cols to [1, 6]; fall back to 2 when undefined.
function colsClass(cols: number | undefined): string {
  const n = Math.max(1, Math.min(6, cols ?? 2));
  return `grid-cols-${n}`;
}

function containerClass(
  mode: LayoutMode,
  cols: number | undefined,
  gap: LayoutGap,
): string {
  const gapCls = GAP_CLASS[gap] ?? GAP_CLASS.md;
  switch (mode) {
    case "hstack":
      return cn("flex flex-row", gapCls);
    case "grid":
      return cn("grid", colsClass(cols), gapCls);
    default:
      // vstack
      return cn("flex flex-col", gapCls);
  }
}

export const LayoutDetail: BlockRenderer = ({ vm }) => {
  const mode = (vm.displayValue.mode as LayoutMode) ?? "vstack";
  // Validate mode — fall back to vstack for unknown values from old data.
  const safeMode: LayoutMode =
    mode === "hstack" || mode === "grid" ? mode : "vstack";
  const cols = vm.displayValue.cols as number | undefined;
  const gap = (vm.displayValue.gap as LayoutGap) ?? "md";
  const safeGap: LayoutGap = gap === "sm" || gap === "lg" ? gap : "md";

  const isHorizontal = safeMode === "hstack" || safeMode === "grid";
  const childIds = useBlockChildren(vm.id);

  const containerCls = containerClass(safeMode, cols, safeGap);

  if (childIds.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/30 p-4">
        <div className={cn(containerCls, "min-h-16 items-stretch")}>
          <InsertSlot
            parentId={vm.id}
            index={0}
            variant="trailing"
            orientation={isHorizontal ? "horizontal" : "vertical"}
          />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          여기에 블록을 추가하세요
        </p>
      </div>
    );
  }

  return (
    <div className={cn(containerCls, "rounded-md min-w-0")}>
      <AnimatePresence initial={false}>
        {childIds.map((id, idx) => (
          <div key={id} className={cn(isHorizontal ? "contents" : "")}>
            <InsertSlot
              parentId={vm.id}
              index={idx}
              orientation={isHorizontal ? "horizontal" : "vertical"}
            />
            <BlockShell blockId={id} />
          </div>
        ))}
      </AnimatePresence>
      <InsertSlot
        parentId={vm.id}
        index={childIds.length}
        variant="trailing"
        orientation={isHorizontal ? "horizontal" : "vertical"}
      />
    </div>
  );
};
