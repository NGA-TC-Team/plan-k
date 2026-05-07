"use client";

import type { BlockRenderer } from "../types";
import { KindBadge, WireBar, WireBox } from "./primitives";

export const FormWireframe: BlockRenderer = ({ vm }) => {
  const fields = (vm.displayValue.fields as unknown[]) ?? [];
  const count = Math.max(fields.length || 3, 2);
  return (
    <WireBox className="space-y-3 px-3 py-3">
      <KindBadge kind="form" />
      <div className="space-y-2.5">
        {Array.from({ length: count }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder fields
          <div key={i} className="space-y-1">
            <WireBar className="h-1.5 w-1/4" />
            <div className="h-7 rounded border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
      <div className="pt-1">
        <div className="h-8 w-24 rounded-md bg-zinc-700 dark:bg-zinc-300" />
      </div>
    </WireBox>
  );
};
