"use client";

import type { BlockRenderer } from "../types";
import { KindBadge, WireBar, WireBox } from "./primitives";

export const CardGridWireframe: BlockRenderer = ({ vm }) => {
  const columns = Math.max(
    1,
    Math.min(6, (vm.displayValue.columns as number) ?? 3),
  );
  const cards = (vm.displayValue.cards as unknown[]) ?? [];
  const cardCount = Math.max(cards.length || columns * 2, columns);
  return (
    <WireBox className="min-w-0 w-full space-y-3 px-3 py-3">
      <div className="flex items-center justify-between">
        <KindBadge kind="card grid" />
        <span className="text-caption text-ink-subtle">{columns} cols</span>
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cardCount }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder cells
            key={i}
            className="flex h-20 flex-col gap-1 rounded border border-hairline bg-surface-1 p-2"
          >
            <div className="h-8 rounded bg-surface-3" />
            <WireBar className="w-3/4" />
            <WireBar className="h-1.5 w-1/2" />
          </div>
        ))}
      </div>
    </WireBox>
  );
};
