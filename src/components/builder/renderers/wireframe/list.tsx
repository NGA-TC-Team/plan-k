"use client";

import type { BlockRenderer } from "../types";
import { KindBadge, WireBar, WireBox } from "./primitives";

export const ListWireframe: BlockRenderer = ({ vm }) => {
  const items = (vm.displayValue.items as unknown[]) ?? [];
  const ordered = Boolean(vm.displayValue.ordered);
  const count = Math.max(items.length || 3, 2);
  return (
    <WireBox className="space-y-2 px-3 py-3">
      <KindBadge kind={ordered ? "ol" : "ul"} />
      <ul className="space-y-1.5">
        {Array.from({ length: count }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows
          <li key={i} className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <WireBar className={`${i % 2 === 0 ? "w-3/4" : "w-2/3"}`} />
          </li>
        ))}
      </ul>
    </WireBox>
  );
};
