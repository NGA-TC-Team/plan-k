"use client";

import type { BlockRenderer } from "../types";
import { KindBadge, WireBar, WireBox } from "./primitives";

export const HeroWireframe: BlockRenderer = ({ vm }) => {
  const hasCta = Boolean((vm.displayValue.cta as string)?.length);
  return (
    <WireBox className="space-y-3 px-6 py-8">
      <KindBadge kind="hero" />
      <WireBar className="h-5 w-3/4" />
      <WireBar className="h-3 w-2/3" />
      <WireBar className="h-3 w-1/2" />
      <div className="pt-2">
        <div
          className={`h-9 w-32 rounded-md ${
            hasCta ? "bg-primary/80" : "bg-surface-3"
          }`}
        />
      </div>
    </WireBox>
  );
};
