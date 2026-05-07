"use client";

import type { BlockRenderer } from "../types";
import { KindBadge, WireBar, WireBox } from "./primitives";

export const TextWireframe: BlockRenderer = ({ vm }) => {
  const md = (vm.displayValue.markdown as string) ?? "";
  const lineCount = Math.min(5, Math.max(2, Math.ceil(md.length / 60) || 3));
  return (
    <WireBox className="space-y-2 px-3 py-3">
      <KindBadge kind="text" />
      <div className="space-y-1.5">
        {Array.from({ length: lineCount }).map((_, i) => (
          <WireBar
            // biome-ignore lint/suspicious/noArrayIndexKey: deterministic placeholder lines
            key={i}
            className={i === lineCount - 1 ? "w-2/3" : "w-full"}
          />
        ))}
      </div>
    </WireBox>
  );
};
