"use client";

import type { BlockRenderer } from "../types";
import { KindBadge, WireBar, WireBox } from "./primitives";

type LayoutMode = "vstack" | "hstack" | "grid";

export const LayoutWireframe: BlockRenderer = ({ vm }) => {
  const mode = (vm.displayValue.mode as LayoutMode) ?? "vstack";
  const safeMode: LayoutMode =
    mode === "hstack" || mode === "grid" ? mode : "vstack";
  const cols = Math.max(1, Math.min(6, (vm.displayValue.cols as number) ?? 2));
  const gap = (vm.displayValue.gap as string) ?? "md";

  const isGrid = safeMode === "grid";
  const isHstack = safeMode === "hstack";

  const cellCount = isGrid ? cols : isHstack ? 3 : 2;

  return (
    <WireBox className="space-y-2 px-3 py-3">
      <div className="flex items-center justify-between">
        <KindBadge kind={`layout · ${safeMode}`} />
        {isGrid ? (
          <span className="text-[10px] text-ink-subtle">{cols} cols</span>
        ) : null}
        <span className="text-[10px] text-ink-subtle">gap {gap}</span>
      </div>
      <div
        className={
          isHstack
            ? "flex flex-row gap-2"
            : isGrid
              ? "grid gap-2"
              : "flex flex-col gap-2"
        }
        style={
          isGrid
            ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {Array.from({ length: cellCount }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder cells only
            key={i}
            className="flex flex-col gap-1 rounded border border-dashed border-hairline bg-surface-1 p-2 min-h-10"
          >
            <WireBar className="w-3/4" />
            <WireBar className="h-1.5 w-1/2" />
          </div>
        ))}
      </div>
    </WireBox>
  );
};
