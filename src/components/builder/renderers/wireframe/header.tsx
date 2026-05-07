"use client";

import type { BlockRenderer } from "../types";
import { KindBadge, WireBar, WireBox } from "./primitives";

export const HeaderWireframe: BlockRenderer = ({ vm }) => {
  const level = ((vm.displayValue.level as number) ?? 1) as 1 | 2 | 3;
  const widthClass = level === 1 ? "w-3/5" : level === 2 ? "w-2/5" : "w-1/4";
  const heightClass = level === 1 ? "h-4" : level === 2 ? "h-3" : "h-2.5";
  return (
    <WireBox className="flex items-center gap-3 px-3 py-3">
      <KindBadge kind={`H${level}`} />
      <WireBar className={`${heightClass} ${widthClass}`} />
    </WireBox>
  );
};
