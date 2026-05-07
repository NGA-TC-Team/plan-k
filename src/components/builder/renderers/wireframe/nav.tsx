"use client";

import type { BlockRenderer } from "../types";
import { KindBadge, WireBox } from "./primitives";

export const NavWireframe: BlockRenderer = ({ vm }) => {
  const items = (vm.displayValue.items as unknown[]) ?? [];
  const count = Math.max(items.length || 4, 3);
  return (
    <WireBox className="flex items-center gap-3 px-4 py-2">
      <div className="size-5 rounded bg-zinc-300 dark:bg-zinc-600" />
      <KindBadge kind="nav" />
      <div className="ml-auto flex items-center gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder nav items
            key={i}
            className="h-2 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600"
          />
        ))}
      </div>
    </WireBox>
  );
};
